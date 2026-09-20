Deploy current changes:
1. pnpm build — build
2. If build succeeds: git add . && git commit && git push && pm2 restart zaahi
3. If build fails — show the errors and fix them
4. After deploy: pm2 logs zaahi --lines 20
