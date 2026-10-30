docker stop keyrouter
docker rm keyrouter
docker build -t keyrouter .
docker run -d --name keyrouter -p 20131:20131 --env-file .env -v keyrouter-data:/app/data keyrouter