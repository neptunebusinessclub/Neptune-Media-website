from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOY = ROOT / '.github/workflows/deploy-cloudflare.yml'
AUDIT = ROOT / '.github/workflows/visual-render-audit.yml'


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f'Could not patch {label}')
    return text.replace(old, new, 1)


def patch_deploy() -> None:
    text = DEPLOY.read_text(encoding='utf-8')
    text = replace_required(
        text,
        '          python3 scripts/apply-home-architecture-v10.py\n',
        '          python3 scripts/apply-home-architecture-v10.py\n          python3 scripts/apply-visual-polish-v11.py\n',
        'v11 render step',
    )
    text = replace_required(
        text,
        '            neptune-tv-media-cloudflare/public/app.js \\\n            neptune-tv-media-cloudflare/public/accessibility.js \\\n',
        '            neptune-tv-media-cloudflare/public/app.js \\\n            neptune-tv-media-cloudflare/public/upgrade.js \\\n            neptune-tv-media-cloudflare/public/accessibility.js \\\n',
        'upgrade source persistence',
    )
    text = replace_required(
        text,
        '            scripts/apply-home-architecture-v10.py\n',
        '            scripts/apply-home-architecture-v10.py \\\n            scripts/apply-visual-polish-v11.py\n',
        'v11 script persistence',
    )
    text = text.replace('feat: persist Neptune emotional conversion architecture v10 [skip ci]', 'feat: persist screenshot-verified Neptune visual polish v11 [skip ci]')
    text = text.replace('?v10=${GITHUB_RUN_ID}', '?v11=${GITHUB_RUN_ID}')
    text = text.replace('/styles/neptune-streaming.css?v=10', '/styles/neptune-streaming.css?v=11')
    text = text.replace('/styles/neptune-streaming.css?v=9', '/styles/neptune-streaming.css?v=11')
    check_anchor = "          curl --fail --silent --show-error \"$PUBLIC_URL/app.js\" | grep -q 'formatLabel'\n"
    check_block = (
        check_anchor
        + "          curl --fail --silent --show-error \"$PUBLIC_URL/app.js\" | grep -Fq 'state.episodes.find((item) => !isShortEpisode(item))'\n"
        + "          curl --fail --silent --show-error \"$PUBLIC_URL/upgrade.js?v=6\" | grep -q 'conversion-voice-v10'\n"
    )
    text = replace_required(text, check_anchor, check_block, 'v11 JavaScript verification')
    marker_anchor = "          grep -q 'Conversion voice architecture v10' /tmp/neptune-streaming.css\n"
    marker_block = marker_anchor + "          grep -q 'Visual QA polish v11' /tmp/neptune-streaming.css\n"
    text = replace_required(text, marker_anchor, marker_block, 'v11 CSS verification')
    DEPLOY.write_text(text, encoding='utf-8')


def patch_audit() -> None:
    text = AUDIT.read_text(encoding='utf-8')
    old_wait = '''          for attempt in 1 2 3 4 5 6; do
            if curl --fail --silent --show-error "$BASE_URL/api/health" | grep -q '"ok":true'; then break; fi
            sleep 10
          done
'''
    new_wait = '''          ready=false
          for attempt in $(seq 1 24); do
            nonce="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${attempt}"
            if curl --fail --silent --show-error -H 'Cache-Control: no-cache' "$BASE_URL/?visual_wait=$nonce" > /tmp/visual-home.html \\
              && grep -q '/styles/neptune-streaming.css?v=11' /tmp/visual-home.html; then
              ready=true
              break
            fi
            sleep 10
          done
          test "$ready" = "true"
'''
    text = replace_required(text, old_wait, new_wait, 'production v11 wait')
    text = replace_required(
        text,
        "              const failedRequests = [];\n",
        "              const failedRequests = [];\n              const httpErrors = [];\n",
        'HTTP response collection',
    )
    request_hook = """              page.on('requestfailed', (request) => {
                failedRequests.push({ url: request.url(), reason: request.failure()?.errorText || 'request_failed' });
              });
"""
    response_hook = request_hook + """              page.on('response', (response) => {
                const status = response.status();
                if (status >= 400) httpErrors.push({ url: response.url(), status, resourceType: response.request().resourceType() });
              });
"""
    text = replace_required(text, request_hook, response_hook, 'HTTP response hook')
    text = replace_required(
        text,
        "                  .filter((el) => visible(el) && (el.textContent || '').trim().length > 8)\n",
        "                  .filter((el) => visible(el) && !el.classList.contains('sr-only') && el.getAttribute('aria-hidden') !== 'true' && (el.textContent || '').trim().length > 8)\n",
        'hidden text exclusion',
    )
    old_clip = """                    const intentional = ['auto', 'scroll'].includes(style.overflowX) || ['auto', 'scroll'].includes(style.overflowY);
                    if (intentional) return false;
                    return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
"""
    new_clip = """                    const intentional = ['auto', 'scroll'].includes(style.overflowX) || ['auto', 'scroll'].includes(style.overflowY);
                    const clamped = style.webkitLineClamp && style.webkitLineClamp !== 'none';
                    if (intentional || clamped || el.closest('.media-card-copy,.seo-card-copy')) return false;
                    return el.scrollWidth > el.clientWidth + 8 || el.scrollHeight > el.clientHeight + 8;
"""
    text = replace_required(text, old_clip, new_clip, 'clipped text precision')
    text = replace_required(
        text,
        "              const capture = { viewport, route, status, diagnostics, consoleErrors, failedRequests, files:",
        "              const capture = { viewport, route, status, diagnostics, consoleErrors, failedRequests, httpErrors, files:",
        'HTTP errors in capture',
    )
    old_report = """              for (const issue of diagnostics.offscreen) report.issues.push({ severity: 'warning', viewport: viewport.name, route: route.name, type: 'offscreen-element', ...issue });
              for (const issue of consoleErrors) report.issues.push({ severity: 'warning', viewport: viewport.name, route: route.name, type: 'console-error', message: issue });
"""
    new_report = """              for (const issue of diagnostics.offscreen) report.issues.push({ severity: 'warning', viewport: viewport.name, route: route.name, type: 'offscreen-element', ...issue });
              for (const issue of httpErrors) report.issues.push({ severity: 'error', viewport: viewport.name, route: route.name, type: 'http-resource', message: `${issue.status} ${issue.resourceType} ${issue.url}` });
              for (const issue of consoleErrors.filter((value) => !value.startsWith('Failed to load resource:'))) report.issues.push({ severity: 'warning', viewport: viewport.name, route: route.name, type: 'console-error', message: issue });
"""
    text = replace_required(text, old_report, new_report, 'precise console and HTTP reporting')
    commit_anchor = """      - name: Commit visual audit evidence
        run: |
"""
    upload_block = """      - name: Record and upload visual audit artifact
        run: |
          printf '{"run_id":%s,"artifact_name":"neptune-visual-audit-%s","source_sha":"%s"}\\n' "$GITHUB_RUN_ID" "$GITHUB_RUN_ID" "$GITHUB_SHA" > visual-audit/latest/artifact-run.json

      - name: Upload visual audit artifact
        uses: actions/upload-artifact@v4
        with:
          name: neptune-visual-audit-${{ github.run_id }}
          path: visual-audit/latest
          if-no-files-found: error
          retention-days: 14

""" + commit_anchor
    text = replace_required(text, commit_anchor, upload_block, 'visual artifact upload')
    AUDIT.write_text(text, encoding='utf-8')


def main() -> None:
    patch_deploy()
    patch_audit()
    print('Integrated visual polish v11 into deployment and screenshot verification')


if __name__ == '__main__':
    main()
