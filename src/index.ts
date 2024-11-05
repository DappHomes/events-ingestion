import {
  Web3,
  Address,
  ContractAbi
} from 'web3';
import DappHomesABI from './data/abi/DappHomes';
import MarketplaceABI from './data/abi/Marketplace';
import * as dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import './utils/Conversion';

dotenv.config();

// web3 configuration
const web3Provider = process.env.RPC_PROVIDER_URL;
if (!web3Provider) {
  throw new Error('no RPC_PROVIDER_URL env variable');
}

const dapphomesFactoryAddress = process.env.DAPPHOMES_FACTORY_ADDRESS;
if (!dapphomesFactoryAddress) {
  throw new Error('no DAPPHOMES_FACTORY_ADDRESS env variable');
}

const initBlock = process.env.INIT_BLOCK;
if (!initBlock) {
  throw new Error('no INIT_BLOCK env variable');
}

const web3 = new Web3(web3Provider);
const contract = new web3.eth.Contract(
  DappHomesABI, process.env.DAPPHOMES_FACTORY_ADDRESS
)

// kafka configuration
const broker = process.env.APACHE_KAFKA_BROKER;
if (!broker) {
  throw new Error('no APACHE_KAFKA_BROKER env variable');
}
const kafkaTopic = process.env.KAFKA_TOPIC;
if (!kafkaTopic) {
  throw new Error('no KAFKA_TOPIC env variable');
}

const kafka = new Kafka({
  clientId: 'events-ingestion',
  brokers: [broker]
})
const producer = kafka.producer();

// get past events from contract
const getPastEvents = async (abi: ContractAbi, address: Address, initBlock: string) => {
  const contract = new web3.eth.Contract(abi, address);
  const events = await contract.getPastEvents(
    'allEvents',
    {
      fromBlock: initBlock,
      toBlock: 'latest'
    }
  )

  return events;
}

// convert past events to kafka messages
const eventsToMessages = async (events: any) => {
  return events.map((event: { address: any; }) => {
    return {key: event.address, value: Buffer.from(JSON.stringify(event))}
  })
}

// send messages to kafka
const sendKafkaMessages = async(kafkaMessages: any) => {
  await producer.send({
    topic: kafkaTopic,
    messages: kafkaMessages
  })
}

const getMarketplaces = async () => {
  return await contract.methods.getDappHomes().call();
}

const run = async () => {
  try {
    // get past events
    console.log(`+ getting past events from factory contract`);
    const events = await getPastEvents(
      DappHomesABI, dapphomesFactoryAddress, initBlock
    );
    console.log(`${dapphomesFactoryAddress} has ${events.length} events`);

    // convert contract events to kafka messages
    await producer.connect();
    console.log(`+ transform factory events to apache kafka messages`);
    const messages = await eventsToMessages(events);

    // send messages to kafka
    console.log(`+ sending messages to apache kafka`);
    await sendKafkaMessages(messages);

    // get created marketplaces
    console.log(`+ getting marketplaces`);
    const marketplaces: any = await getMarketplaces();

    // publish marketplaces past events
    await Promise.all(
      marketplaces.map(async (marketplace: string) => {
        const marketplaceEvents = await getPastEvents(
          MarketplaceABI, marketplace, initBlock
        );
        console.log(`${marketplace} has ${marketplaceEvents.length} events`);

        const marketplaceMessages = await eventsToMessages(marketplaceEvents);
        await sendKafkaMessages(marketplaceMessages);
      })
    );
    
    // close producer
    console.log(`+ disconnecting apache kafka producer`);
    await producer.disconnect();

    return 'past events published';
  } catch (e) {
    return `cannot publish events: ${e}`;
  }
}

run()
.then(result => console.log(result))
.catch(error => console.log(error));
