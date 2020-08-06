const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 
const axios = require('axios');
const fs = require('fs');

// Define connection string and related Service Bus entity names here
const endpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const topicName = "licenseplateread"; 
const subscriptionKey = "lljogbgtkpoozqvj"; 

async function main() {
  // SETUP
  const sbClient = ServiceBusClient.createFromConnectionString(endpoint); 
  const subscriptionClient = sbClient.createSubscriptionClient(topicName, subscriptionKey);
  const receiver = subscriptionClient.createReceiver(ReceiveMode.receiveAndDelete);

  try {
    // GET MESSAGES
    const messages = await receiver.receiveMessages(50);
    const plates = messages.map(message => message.body);

    // GET LOCAL WANTED PLATES
    const wanted = JSON.parse(fs.readFileSync('./data/wanted.json'));
    console.log(wanted);

    // FILTER FOUND PLATES WITH WANTED PLATES
    const filtered = plates.filter(plate => wanted.includes(plate.LicensePlate));
    console.log(filtered.map(item => item.LicensePlate));

    // SEND THE WANTED PLATES
    for(const plate of filtered) {
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
        payload,
        {
          headers: {
            Authorization: 'Basic dGVhbTAyOl0pKVhpeVJiTEtUPSlkcyE=' 
          }
        }
      );
      console.log(response.data);
    }

    await subscriptionClient.close();
  } finally {
    await sbClient.close();
  }
}

async function getWanted() {
  // GET WANTED PLATES
  // THIS COSTS MONEY !!!
  // DATA IN WANTED.JSON
  const plates = await axios.get('https://licenseplatevalidator.azurewebsites.net/api/lpr/wantedplates', {
    auth: {
      username: 'team02',
      password: ']))XiyRbLKT=)ds!'
    }
  });
  fs.writeFileSync('./data/wanted.json', plates.data);
}

main().catch((err) => {
  console.log("Error occurred: ", err);
});