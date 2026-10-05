# Guard test suite. Run: bash .claude/hooks/test-guard.sh   (expects 0 failed)
# The real salon account id is NOT in this public file. A fake id is registered as "blocked" via
# ZEDPATH_GUARD_EXTRA_BLOCKED_ID, which exercises the same isSalonId() path as the real fingerprint.
S=$(cygpath -m "$(mktemp -d)" 2>/dev/null || mktemp -d)
mkdir -p $S/none $S/salon/.git $S/good/.git $S/other/.git $S/fresh/.git
G="$(dirname "$0")/zedpath-guard.cjs"
SID=deadbeefdeadbeefdeadbeefdeadbeef
export ZEDPATH_GUARD_EXTRA_BLOCKED_ID=$SID
export ZEDPATH_GUARD_TEST_ACCOUNT_ID=0123456789abcdef0123456789abcdef
mkdir -p $S/stranger; echo '{"account_id":"fedcba9876543210fedcba9876543210"}' > $S/stranger/wrangler.jsonc
echo "{\"name\":\"x\",\"account_id\":\"$SID\"}" > $S/salon/wrangler.jsonc
printf '{"name":"x", // comment\n "account_id": "0123456789abcdef0123456789abcdef"}\n' > $S/good/wrangler.jsonc
printf '[remote "origin"]\n\turl = https://github.com/PraveenBanneka/zedpath.git\n' > $S/good/.git/config
printf '[remote "origin"]\n\turl = https://github.com/PraveenBanneka/some-private-repo.git\n' > $S/other/.git/config
printf '[core]\n\tbare = false\n' > $S/fresh/.git/config
mk(){ printf '%s\n' "{\"type\":\"user\",\"message\":{\"role\":\"user\",\"content\":\"$1\"}}" '{"type":"assistant","message":{"content":[]}}' '{"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"GO"}]}}' > $S/$2.jsonl; }
mk "GO deploy it" go; mk "please ask me for a clear GO" nogo; mk "ok" ok
pass=0; fail=0
t(){ # name dir transcript tool cmd expect
  P="{\"tool_name\":\"$4\",\"tool_input\":{\"command\":\"$5\",\"file_path\":\"$5\"},\"transcript_path\":\"$S/$3.jsonl\"}"
  out=$(echo "$P" | CLAUDE_PROJECT_DIR=$S/$2 node $G 2>&1); rc=$?
  r=$([ $rc -eq 0 ] && echo ALLOW || echo BLOCK)
  if [ $r = $6 ]; then mark=PASS; pass=$((pass+1)); else mark=FAIL; fail=$((fail+1)); fi
  printf '%-4s %-5s %-44s %s\n' "$mark" "$r" "$1" "$(echo $out | sed 's/ZEDPATH GUARD BLOCKED: //' | cut -c1-60)"; }
SALON="/c/Users/prave/OneDrive/Documents/New website june 20"
echo "-- local work (pinned defaults: allowed)"
t "local dev allowed"                    none ok   Bash "npx wrangler dev" ALLOW
t "whoami allowed"                       none ok   Bash "npx wrangler whoami" ALLOW
t "npm install allowed"                  none ok   Bash "npm install" ALLOW
t "d1 local migration allowed"           good ok   Bash "npx wrangler d1 migrations apply db --local" ALLOW
echo "-- account switching + salon (always blocked)"
t "wrangler login blocked (even w/ GO)"  good go   Bash "npx wrangler login" BLOCK
t "wrangler logout blocked"              good go   PowerShell "wrangler logout" BLOCK
t "cf auth login blocked"                good go   Bash "cf auth login" BLOCK
t "salon folder cmd blocked"             good go   Bash "ls '$SALON'" BLOCK
t "salon folder Read blocked"            good go   Read "$SALON/x.txt" BLOCK
t "salon account id blocked"             good go   Bash "CLOUDFLARE_ACCOUNT_ID=$SID wrangler dev" BLOCK
echo "-- Cloudflare outward actions (pinned account + GO)"
t "deploy, no config"                    none go   Bash "npx wrangler deploy" BLOCK
t "deploy, salon pinned (even w/ GO)"    salon go  Bash "npx wrangler deploy" BLOCK
t "deploy, good pin, no GO"              good ok   Bash "npx wrangler deploy" BLOCK
t "deploy, GO only mid-sentence"         good nogo Bash "npx wrangler deploy" BLOCK
t "deploy, good pin + GO"                good go   Bash "npx wrangler deploy" ALLOW
t "deploy, pinned to 3rd account + GO"   stranger go Bash "npx wrangler deploy" BLOCK
t "secret put, no GO"                    good ok   Bash "npx wrangler secret put KEY" BLOCK
t "d1 --remote, no GO"                   good ok   Bash "npx wrangler d1 execute db --remote --command x" BLOCK
t "d1 migrations apply (remote default)" good ok   Bash "npx wrangler d1 migrations apply db" BLOCK
t "npm run deploy, no GO"                good ok   Bash "npm run deploy" BLOCK
t "opennext deploy, no GO"               good ok   PowerShell "npx opennextjs-cloudflare deploy" BLOCK
t "CF MCP execute, no GO"                good ok   mcp__plugin_cloudflare_cloudflare__execute "" BLOCK
t "CF MCP search allowed"                good ok   mcp__plugin_cloudflare_cloudflare__search "" ALLOW
t "other MCP allowed"                    good ok   mcp__claude_ai_Canva__help "" ALLOW
echo "-- GitHub (rule 8: one public repo, nothing else)"
t "create zedpath, no remote yet"        fresh ok  Bash "gh repo create PraveenBanneka/zedpath --public --source . --push" ALLOW
t "create zedpath again (remote exists)" good ok   Bash "gh repo create PraveenBanneka/zedpath --public" BLOCK
t "create any other repo"                fresh go  Bash "gh repo create PraveenBanneka/other --public" BLOCK
t "make another repo public"             good go   Bash "gh repo edit PraveenBanneka/salon --visibility public" BLOCK
t "delete a repo"                        good go   Bash "gh repo delete PraveenBanneka/zedpath --yes" BLOCK
t "gh api write to other repo"           good go   Bash "gh api -X PATCH repos/PraveenBanneka/salon -f private=false" BLOCK
t "gh api write to zedpath"              good ok   Bash "gh api -X PATCH repos/PraveenBanneka/zedpath -f description=x" ALLOW
t "add remote to other repo"             good go   Bash "git remote add x https://github.com/PraveenBanneka/salon.git" BLOCK
t "push to zedpath origin"               good ok   Bash "git push origin main" ALLOW
t "push with explicit other URL"         good go   Bash "git push https://github.com/PraveenBanneka/salon.git main" BLOCK
t "push when origin is another repo"     other go  Bash "git push origin main" BLOCK
t "force-push, no GO"                    good ok   Bash "git push --force origin main" BLOCK
t "force-push with GO"                   good go   Bash "git push --force origin main" ALLOW
t "force-push via -f, no GO"             good ok   Bash "git push -f origin main" BLOCK
t "force-push via +refspec, no GO"       good ok   Bash "git push origin +main" BLOCK
t "commit -F then normal push"           good ok   Bash "git commit -F msg.txt && git push -q" ALLOW
echo "== $pass passed, $fail failed =="
