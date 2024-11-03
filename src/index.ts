import Web3 from 'web3';
import * as dotenv from 'dotenv';
import DappHomesABI from './data/abi/DappHomes';
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
const getPastEvents = async () => {
  const events = await contract.getPastEvents(
    'allEvents',
    {
      fromBlock: process.env.INIT_BLOCK,
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
  await producer.connect();
  await producer.send({
    topic: kafkaTopic,
    messages: kafkaMessages
  })
}

const run = async () => {
  try {
    // get past events
    const events = await getPastEvents();

    // convert contract events to kafka messages
    const messages = await eventsToMessages(events);

    // send messages to kafka
    await sendKafkaMessages(messages);
    
    // close producer
    await producer.disconnect();

    return 'past events published';
  } catch (e) {
    return `cannot publish events: ${e}`;
  }
}

run()
.then(result => console.log(result))
.catch(error => console.log(error));
