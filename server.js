const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 

// Define connection string and related Service Bus entity names here
const endpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const topicName = "licenseplateread"; 
const subscriptionKey = "lljogbgtkpoozqvj"; 

async function main(){
  const sbClient = ServiceBusClient.createFromConnectionString(endpoint); 
  const subscriptionClient = sbClient.createSubscriptionClient(topicName, subscriptionKey);
  const receiver = subscriptionClient.createReceiver(ReceiveMode.receiveAndDelete);

  try {
    const messages = await receiver.receiveMessages(10);
    console.log("Received messages:");
    console.log(messages.map(message => message.body));

    await subscriptionClient.close();
  } finally {
    await sbClient.close();
  }
}

main().catch((err) => {
  console.log("Error occurred: ", err);
});