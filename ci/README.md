# Optional CI workflow

`pages-workflow.yml` deploys the site to GitHub Pages and runs
`scripts/validate.mjs` first, so a map with dangling edges or unknown clusters
fails the deploy instead of shipping.

It lives here rather than in `.github/workflows/` because adding a workflow file
requires a token with the `workflow` scope, which the session that generated this
repository didn't have. To enable it:

```bash
mkdir -p .github/workflows
git mv ci/pages-workflow.yml .github/workflows/pages.yml
git rm ci/README.md
git commit -m "Enable Pages deploy workflow"
git push
```

Then set **Settings → Pages → Source: GitHub Actions**.

You don't need this at all if you use **Settings → Pages → Deploy from a branch**
instead — the site is plain static files with no build step, so branch deploys
work as-is. The workflow only adds the validation gate.
