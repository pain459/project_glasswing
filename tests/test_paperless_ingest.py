"""Unit tests for the Paperless inbox caption parser and tag logic.

These tests cover the pure-logic functions that don't require network access:
  - parse_file_caption (caption grammar)
  - format_age (duration formatting)
  - Tag validation against the allowed set

Run with:
  python3 -m pytest tests/test_paperless_ingest.py -v
"""

import sys
import os
import time
from unittest.mock import patch

# Add the situation stack to the path so we can import listener.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "stacks", "situation"))

# We need to mock the brief module imports before importing listener,
# because brief.py reads env vars at import time.
import types

# Create a minimal mock of the brief module
brief_mock = types.ModuleType("brief")
brief_mock.gather_snapshot = lambda: {}
brief_mock.reason = lambda s: ""
brief_mock.deliver = lambda b: True
brief_mock.gather_docker = lambda: {}
brief_mock.gather_host_metrics = lambda: {}
brief_mock.gather_uptime_kuma = lambda: {}
brief_mock.gather_openobserve_errors = lambda: {}
brief_mock.gather_litellm_spend = lambda: {}
brief_mock.paperless_ingest = lambda **kw: None
brief_mock.paperless_list_tags = lambda: None
brief_mock.paperless_download_from_telegram = lambda fid: None
brief_mock.paperless_search = lambda **kw: None
brief_mock.paperless_recent = lambda **kw: None
brief_mock.paperless_get_document = lambda doc_id: None
brief_mock.HTTP_TIMEOUT = 15

sys.modules["brief"] = brief_mock

# Set required env vars before importing listener
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test-token")
os.environ.setdefault("TELEGRAM_CHAT_ID", "test-chat")

import listener  # noqa: E402


# ---------------------------------------------------------------------------
# parse_file_caption
# ---------------------------------------------------------------------------


class TestParseFileCaption:
    def test_no_prefix_returns_none(self):
        assert listener.parse_file_caption("") is None
        assert listener.parse_file_caption("hello") is None
        assert listener.parse_file_caption("#other") is None
        assert listener.parse_file_caption("file tag=bills") is None

    def test_bare_file(self):
        result = listener.parse_file_caption("#file")
        assert result is not None
        assert result["tag"] == "others"
        assert result["title"] == ""
        assert result["correspondence"] == ""
        assert result["subject"] == ""

    def test_tag_bills(self):
        result = listener.parse_file_caption("#file tag=bills")
        assert result["tag"] == "bills"
        assert result["title"] == ""

    def test_tag_case_insensitive(self):
        result = listener.parse_file_caption("#file tag=BILLS")
        assert result["tag"] == "bills"

    def test_tag_invalid(self):
        result = listener.parse_file_caption("#file tag=receipts")
        assert "error" in result
        assert "receipts" in result["error"]
        assert "bills" in result["error"]  # valid tags listed

    def test_tag_with_title(self):
        result = listener.parse_file_caption("#file tag=bills electricity")
        assert result["tag"] == "bills"
        assert result["title"] == "electricity"

    def test_title_only(self):
        result = listener.parse_file_caption("#file electricity bill October")
        assert result["tag"] == "others"
        assert result["title"] == "electricity bill October"

    def test_corr_short(self):
        result = listener.parse_file_caption("#file tag=bills corr=HSBC")
        assert result["correspondence"] == "HSBC"

    def test_corr_long(self):
        result = listener.parse_file_caption("#file correspondence=HSBC")
        assert result["correspondence"] == "HSBC"

    def test_subject(self):
        result = listener.parse_file_caption("#file tag=cards subject=October")
        assert result["subject"] == "October"

    def test_all_fields(self):
        result = listener.parse_file_caption(
            "#file tag=bills corr=HSBC subject=Oct electricity"
        )
        assert result["tag"] == "bills"
        assert result["correspondence"] == "HSBC"
        assert result["subject"] == "Oct"
        assert result["title"] == "electricity"

    def test_multiple_words_title(self):
        result = listener.parse_file_caption("#file tag=invites wedding reception")
        assert result["tag"] == "invites"
        assert result["title"] == "wedding reception"

    def test_whitespace_handling(self):
        result = listener.parse_file_caption("  #file   tag=bills   ")
        assert result["tag"] == "bills"


# ---------------------------------------------------------------------------
# format_age
# ---------------------------------------------------------------------------


class TestFormatAge:
    def test_seconds(self):
        assert listener.format_age(5) == "5s"
        assert listener.format_age(59) == "59s"

    def test_minutes(self):
        assert listener.format_age(60) == "1m"
        assert listener.format_age(300) == "5m"
        assert listener.format_age(3599) == "59m"

    def test_hours(self):
        assert listener.format_age(3600) == "1h"
        assert listener.format_age(7200) == "2h"

    def test_hours_and_minutes(self):
        assert listener.format_age(3660) == "1h 1m"
        assert listener.format_age(9 * 3600 + 12 * 60) == "9h 12m"

    def test_days(self):
        assert listener.format_age(86400) == "1d"
        assert listener.format_age(2 * 86400) == "2d"

    def test_days_and_hours(self):
        assert listener.format_age(86400 + 3600) == "1d 1h"
        assert listener.format_age(2 * 86400 + 3 * 3600) == "2d 3h"


# ---------------------------------------------------------------------------
# Tag set
# ---------------------------------------------------------------------------


class TestTagSet:
    def test_default_tags_present(self):
        for tag in ["bills", "cards", "invites", "others"]:
            assert tag in listener.ALLOWED_TAGS, f"Missing default tag: {tag}"

    def test_allowed_tags_are_lowercase(self):
        for tag in listener.ALLOWED_TAGS:
            assert tag == tag.lower()


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


class TestConstants:
    def test_stale_threshold(self):
        assert listener.STALE_THRESHOLD == 300

    def test_max_file_size(self):
        assert listener.MAX_FILE_SIZE == 10 * 1024 * 1024

    def test_allowed_mime_types(self):
        assert "image/jpeg" in listener.ALLOWED_MIME_TYPES
        assert "application/pdf" in listener.ALLOWED_MIME_TYPES
        assert "image/heic" in listener.ALLOWED_MIME_TYPES

    def test_allowed_extensions(self):
        assert ".jpg" in listener.ALLOWED_EXTENSIONS
        assert ".pdf" in listener.ALLOWED_EXTENSIONS
        assert ".heic" in listener.ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# parse_docs_command
# ---------------------------------------------------------------------------


class TestParseDocsCommand:
    def test_no_prefix_returns_none(self):
        assert listener.parse_docs_command("") is None
        assert listener.parse_docs_command("hello") is None
        assert listener.parse_docs_command("/other") is None
        assert listener.parse_docs_command("docs electricity") is None

    def test_bare_docs_returns_none(self):
        # No args — caller shows usage
        assert listener.parse_docs_command("/docs") is None
        assert listener.parse_docs_command("/docs   ") is None

    def test_query_only(self):
        result = listener.parse_docs_command("/docs electricity")
        assert result is not None
        assert result["query"] == "electricity"
        assert result["tag"] == ""
        assert result["corr"] == ""
        assert result["page"] == 1

    def test_tag_only(self):
        result = listener.parse_docs_command("/docs tag=bills")
        assert result["tag"] == "bills"
        assert result["query"] == ""

    def test_tag_case_insensitive(self):
        result = listener.parse_docs_command("/docs tag=BILLS")
        assert result["tag"] == "bills"

    def test_tag_invalid(self):
        result = listener.parse_docs_command("/docs tag=receipts")
        assert "error" in result
        assert "receipts" in result["error"]
        assert "bills" in result["error"]

    def test_corr_short(self):
        result = listener.parse_docs_command("/docs corr=HSBC")
        assert result["corr"] == "HSBC"

    def test_corr_long(self):
        result = listener.parse_docs_command("/docs correspondence=HSBC")
        assert result["corr"] == "HSBC"

    def test_tag_and_query(self):
        result = listener.parse_docs_command("/docs tag=bills electricity")
        assert result["tag"] == "bills"
        assert result["query"] == "electricity"

    def test_page(self):
        result = listener.parse_docs_command("/docs page=2 electricity")
        assert result["page"] == 2
        assert result["query"] == "electricity"

    def test_page_invalid(self):
        result = listener.parse_docs_command("/docs page=abc electricity")
        assert result["page"] == 1  # falls back to 1

    def test_page_zero_clamped(self):
        result = listener.parse_docs_command("/docs page=0 electricity")
        assert result["page"] == 1  # clamped to 1

    def test_all_fields(self):
        result = listener.parse_docs_command("/docs tag=bills corr=HSBC page=3 electricity")
        assert result["tag"] == "bills"
        assert result["corr"] == "HSBC"
        assert result["page"] == 3
        assert result["query"] == "electricity"

    def test_multi_word_query(self):
        result = listener.parse_docs_command("/docs electricity bill October")
        assert result["query"] == "electricity bill October"

    def test_whitespace_handling(self):
        result = listener.parse_docs_command("  /docs   tag=bills   electricity  ")
        assert result["tag"] == "bills"
        assert result["query"] == "electricity"


# ---------------------------------------------------------------------------
# _strip_html
# ---------------------------------------------------------------------------


class TestStripHtml:
    def test_no_html(self):
        assert listener._strip_html("plain text") == "plain text"

    def test_span_tags(self):
        assert listener._strip_html("text <span class=\"match\">Test</span> text") == "text Test text"

    def test_multiple_tags(self):
        assert listener._strip_html("<b>bold</b> and <i>italic</i>") == "bold and italic"

    def test_empty(self):
        assert listener._strip_html("") == ""


# ---------------------------------------------------------------------------
# _format_doc_line
# ---------------------------------------------------------------------------


class TestFormatDocLine:
    def test_basic(self):
        doc = {
            "id": 42,
            "title": "Electricity Bill",
            "created": "2026-10-15T14:32:00Z",
            "tags": [{"id": 1, "name": "bills"}],
            "correspondent": "HSBC",
        }
        lines = listener._format_doc_line(1, doc)
        assert "1. #42 — Electricity Bill" in lines[0]
        assert any("📅 2026-10-15" in l for l in lines)
        assert any("🏷️ bills" in l for l in lines)
        assert any("✉️ HSBC" in l for l in lines)

    def test_no_tags_no_corr(self):
        doc = {
            "id": 7,
            "title": "Random",
            "created": "2026-01-01T00:00:00Z",
            "tags": [],
            "correspondent": None,
        }
        lines = listener._format_doc_line(1, doc)
        assert "1. #7 — Random" in lines[0]
        # Should still have the date line
        assert any("📅 2026-01-01" in l for l in lines)

    def test_highlights(self):
        doc = {
            "id": 1,
            "title": "Test",
            "created": "2026-01-01T00:00:00Z",
            "tags": [],
            "correspondent": None,
            "__search_hit__": {
                "highlights": "your <span class=\"match\">electricity</span> bill",
            },
        }
        lines = listener._format_doc_line(1, doc, show_highlights=True)
        assert any('"your electricity bill"' in l for l in lines)

    def test_untitled(self):
        doc = {"id": 1, "title": None, "created": "", "tags": [], "correspondent": None}
        lines = listener._format_doc_line(1, doc)
        assert "(untitled)" in lines[0]
