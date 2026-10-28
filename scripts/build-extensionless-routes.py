#!/usr/bin/env python3
"""Build extensionless directory routes for Hamlet's static GitHub Pages site.

Runs only in the Pages deployment workspace. Source files remain named *.html
in Git; the published artifact receives route aliases such as /about/index.html.
"""
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(".")
SKIP_PARTS = {
    ".git", ".github", "node_modules", "functions", "sagat", "ryu", "ken",
    "hamlet-ai-gateway", "worker", "vendor",
}
HTML_SUFFIX = re.compile(r"(?i)\.html$")
ATTR_HREF = re.compile(r"""(?P<prefix>\bhref\s*=\s*)(?P<quote>["'])(?P<url>[^"'<>]+)(?P=quote)""", re.I)
REDIRECT_SCRIPT = r"""<script id="hamlet-extensionless-canonical">
(function () {
  var path = window.location.pathname;
  var clean = null;
  if (/\/index\.html$/i.test(path)) {
    clean = path.replace(/index\.html$/i, '');
    if (!clean) clean = '/';
  } else if (/\.html$/i.test(path)) {
    clean = path.slice(0, -5) + '/';
  }
  if (clean && clean !== path) {
    window.location.replace(clean + window.location.search + window.location.hash);
  }
})();
</script>"""

def excluded(path):
    return any(part in SKIP_PARTS for part in path.parts)

def clean_link(url):
    # Preserve external links, protocol-relative links, non-page assets, and
    # fragment-only references. Only rewrite local links whose path ends .html.
    if not url or url.startswith(("#", "//")):
        return url
    if re.match(r"(?i)^[a-z][a-z0-9+.-]*:", url):
        return url
    match = re.match(r"^([^?#]*)([?#].*)?$", url)
    if not match:
        return url
    path, suffix = match.group(1), match.group(2) or ""
    if not HTML_SUFFIX.search(path):
        return url
    if path.lower().endswith("/index.html") or path.lower() == "index.html":
        new_path = path[:-10]
        if not new_path:
            new_path = "./"
        elif not new_path.endswith("/"):
            new_path += "/"
    else:
        new_path = path[:-5] + "/"
    return new_path + suffix

def add_base(html, base):
    if re.search(r"<base\b", html, re.I):
        return html
    tag = '<base href="' + base + '">'
    if re.search(r"<head\b[^>]*>", html, re.I):
        return re.sub(r"(<head\b[^>]*>)", r"\1\n    " + tag, html, count=1, flags=re.I)
    return html.replace("<html", "<html", 1) if False else html

def main():
    html_files = sorted(
        p for p in ROOT.rglob("*.html")
        if p.is_file() and not excluded(p.relative_to(ROOT))
    )
    if not html_files:
        print("No HTML source files found.", file=sys.stderr)
        return 1

    # Rewrite only HTML href attributes; JavaScript, CSS, APIs and asset URLs
    # are left intact. This is done in the disposable deployment workspace.
    originals = {}
    for path in html_files:
        text = path.read_text(encoding="utf-8", errors="replace")
        text = ATTR_HREF.sub(lambda m: m.group("prefix") + m.group("quote") +
                             clean_link(m.group("url")) + m.group("quote"), text)
        if not re.search(r'id=["\']hamlet-extensionless-canonical["\']', text, re.I):
            if re.search(r"</head\s*>", text, re.I):
                text = re.sub(r"</head\s*>", REDIRECT_SCRIPT + "\n</head>", text,
                              count=1, flags=re.I)
        path.write_text(text, encoding="utf-8")
        originals[path] = text

    created = 0
    skipped = 0
    for source, text in originals.items():
        rel = source.relative_to(ROOT)
        if source.name.lower() == "index.html":
            # Directory index URLs already omit the filename.
            continue
        route_dir = source.parent / source.stem
        target = route_dir / "index.html"
        if target.exists():
            skipped += 1
            continue
        route_dir.mkdir(parents=True, exist_ok=True)
        parent = "/" if str(source.parent) == "." else "/" + source.parent.as_posix().strip("/") + "/"
        alias = add_base(text, parent)
        target.write_text(alias, encoding="utf-8")
        created += 1

    print(f"Extensionless route build complete: {len(html_files)} HTML files processed; "
          f"{created} route aliases created; {skipped} existing route directories preserved.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
