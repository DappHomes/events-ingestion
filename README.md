# events-ingestion

DappHomes events ingestion to [data-stack](https://github.com/DappHomes/data-stack) for further analysis.

## dependencies

* [data-stack](https://github.com/DappHomes/data-stack)

## deployment

Please, modify env variables to meet your needs:

```bash
git clone https://github.com/DappHomes/events-ingestion
cd events-ingestion/
cp .env.example .env
```

| Name | Description | Example |
|---|---|---|
| RPC_PROVIDER_URL | RPC network endpoint | https://rpc-amoy.polygon.technology/ |
| DAPPHOMES_FACTORY_ADDRESS | DappHomes factory contract | 0x9Fe6511002323c34012621F1f48479e08FCb425E |
| INIT_BLOCK | Initial block where factory contract was deployed | 7430577 |
| APACHE_KAFKA_BROKER | Apache Kafka broker URL | broker:29092 |
| KAFKA_TOPIC | Apache Kafka topic to publish contract events | contracts-events |

Then you can deploy using docker:

```bash
docker compose up -d --build
```
