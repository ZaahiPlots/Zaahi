Деплой текущих изменений:
1. pnpm build — собрать
2. Если build успешен: git add . && git commit && git push && pm2 restart zaahi
3. Если build упал — покажи ошибки и исправь
4. После деплоя: pm2 logs zaahi --lines 20
