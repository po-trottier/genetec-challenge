const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 
const axios = require('axios');
const fs = require('fs');

// CONSTANTS
const platesEndpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const platesTopicName = "licenseplateread"; 
const platesSubscriptionKey = "lljogbgtkpoozqvj"; 
const wantedEndpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=listeneronly;SharedAccessKey=w+ifeMSBq1AQkedLCpMa8ut5c6bJzJxqHuX9Jx2XGOk=";
const wantedTopicName = "wantedplatelistupdate"; 
const wantedSubscriptionKey = "lljogbgtkpoozqvj"; 

async function main() {
  // SETUP
  const platesClient = ServiceBusClient.createFromConnectionString(platesEndpoint); 
  const platesSubscription = platesClient.createSubscriptionClient(platesTopicName, platesSubscriptionKey);
  const platesReceiver = platesSubscription.createReceiver(ReceiveMode.receiveAndDelete);

  const wantedClient = ServiceBusClient.createFromConnectionString(wantedEndpoint); 
  const wantedSubscription = wantedClient.createSubscriptionClient(wantedTopicName, wantedSubscriptionKey);
  const wantedReceiver = wantedSubscription.createReceiver(ReceiveMode.receiveAndDelete);

  try {
    platesReceiver.registerMessageHandler(sendLicensePlates, onError);    
    wantedReceiver.registerMessageHandler(getWanted, onError);
    await platesSubscription.close();
    await wantedSubscription.close();
  } finally {
    await platesClient.close();
    await wantedClient.close();
  }
}

async function sendLicensePlates(message) {
  const plate = message.body;

  // GET LOCAL WANTED PLATES
  const wanted = JSON.parse(fs.readFileSync('./data/wanted.json'));
  console.log(wanted);

  // FILTER FOUND PLATES WITH WANTED PLATES
  if(!wanted.includes(plate.LicensePlate))
    return;

  // SEND THE WANTED PLATES
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

async function getWanted(message) {
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

async function onError(error) {
  console.error(error);
}

// RUN
main().catch((err) => {
  console.log("Error occurred: ", err);
});