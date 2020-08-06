const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 
const axios = require('axios');

// Define connection string and related Service Bus entity names here
const endpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const topicName = "licenseplateread"; 
const subscriptionKey = "lljogbgtkpoozqvj"; 

async function main(){
  const sbClient = ServiceBusClient.createFromConnectionString(endpoint); 
  const subscriptionClient = sbClient.createSubscriptionClient(topicName, subscriptionKey);
  const receiver = subscriptionClient.createReceiver(ReceiveMode.receiveAndDelete);

  try {
    const messages = await receiver.receiveMessages(1);
  
    const array = messages.map(message => JSON.stringify(message.body));

    for (let i = 0; i < array.length; i++) {
      const obj = JSON.parse(array[i]);
      const body = {
        LicensePlateCaptureTime: obj.LicensePlateCaptureTime,
        LicensePlate: obj.LicensePlate,
        Latitude: obj.Latitude,
        Longitude: obj.Longitude,
      };

      console.log(body);

      // const response = await axios.post(
      //   'https://licenseplatevalidator.azurewebsites.net/api/lpr/platelocation', 
      //   body,
      //   {
      //     auth: {
      //       username: 'team02',
      //       password: ']))XiyRbLKT=)ds!'
      //     }
      //   }
      // );

      // console.log(response);
    }

    await subscriptionClient.close();
  } finally {
    await sbClient.close();
  }
}

main().catch((err) => {
  console.log("Error occurred: ", err);
});