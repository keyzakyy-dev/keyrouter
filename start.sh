docker stop keyrouter
docker rm keyrouter
docker build -t keyrouter .
docker run -d --name keyrouter -p 20128:20128 --env-file .env -v keyrouter-data:/app/data keyrouter