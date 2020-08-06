const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 
const axios = require('axios');

// Define connection string and related Service Bus entity names here
const endpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const topicName = "licenseplateread"; 
const subscriptionKey = "lljogbgtkpoozqvj"; 

async function main(){
  // SETUP
  const sbClient = ServiceBusClient.createFromConnectionString(endpoint); 
  const subscriptionClient = sbClient.createSubscriptionClient(topicName, subscriptionKey);
  const receiver = subscriptionClient.createReceiver(ReceiveMode.receiveAndDelete);

  try {
    const messages = await receiver.receiveMessages(10);

    const plates = messages.map(message => message.body);

    for(const plate of plates) {
      let payload = {
        LicensePlateCaptureTime : plate.LicensePlateCaptureTime,
        LicensePlate            : plate.LicensePlate,
        Latitude                : plate.Latitude,
        Longitude               : plate.Longitude
      }
      console.log(payload);

      // SEND THE REQUEST
      const response = await axios.post(
        'https://licenseplatevalidator.azurewebsites.net/api/lpr/platelocation', 
        body,
        {
          auth: {
            username: 'team02',
            password: ']))XiyRbLKT=)ds!'
          }
        }
      );
      console.log(response);

      // GET WANTED PLATES
      // THIS COSTS MONEY !!!
      // let plates = await axios.get('https://licenseplatevalidator.azurewebsites.net/api/lpr/wantedplates', {
      //   auth: {
      //     username: 'team02',
      //     password: ']))XiyRbLKT=)ds!'
      //   }
      // });
      // plates = plates.data;
      // console.log(plates);

      // FILTER FOUND PLATES WITH WANTED PLATES
      // const filtered = array.filter(item => plates.includes(item.LicensePlate))
      // console.log(filtered);
    }

    await subscriptionClient.close();
  } finally {
    await sbClient.close();
  }
}

main().catch((err) => {
  console.log("Error occurred: ", err);
});