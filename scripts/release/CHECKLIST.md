# Release Checklist

## Pre-Release
- [ ] All smoke tests pass (8 benchmark stocks)
- [ ] `npm run build` completes without errors
- [ ] aiChangeLog updated for current phase
- [ ] No uncommitted changes in working directory

## Release Steps
1. Run version bump: `./scripts/release/bump-version.sh [major|minor|patch]`
2. Push to origin: `git push && git push --tags`
3. Verify CI/CD pipeline passes
4. Create GitHub release with changelog notes

## Post-Release
- [ ] Verify production deployment
- [ ] Run smoke tests on production URL
- [ ] Update `master_project_history.md` with release notes
