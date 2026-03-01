docker compose restart app
Start-Sleep -Seconds 6
docker compose logs --tail=40 app
