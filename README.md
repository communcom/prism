# PRISM-SERVICE

#### Clone the repository

```bash
git clone https://github.com/communcom/prism.git
cd prism
```

#### Create .env file

```bash
cp .env.example .env
```

Add variables
```bash
GLS_BLOCKCHAIN_BROADCASTER_CONNECT=nats://user:password@ip:4222
GLS_FACADE_CONNECT=http://facade-node:port
GLS_SEARCH_CONNECTION_STRING=http://elasticsearch:9200
GLS_META_CONNECT=http://meta-node:port
```

#### Create docker-compose file

```bash
cp docker-compose.example.yml docker-compose.yml 
```

#### Run

```bash
docker-compose up -d --build
```