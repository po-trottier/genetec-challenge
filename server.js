const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 
const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");
const axios = require('axios');
const fs = require('fs');

const AzureStorageBlob = require("@azure/storage-blob");

// CONSTANTS
const platesEndpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const platesTopicName = "licenseplateread"; 
const platesSubscriptionKey = "lljogbgtkpoozqvj"; 

const wantedEndpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=listeneronly;SharedAccessKey=w+ifeMSBq1AQkedLCpMa8ut5c6bJzJxqHuX9Jx2XGOk=";
const wantedTopicName = "wantedplatelistupdate"; 
const wantedSubscriptionKey = "lljogbgtkpoozqvj"; 

const STORAGE_BLOB_ACCOUNT = "contextimagereferences";
const DEFAULT_AZURE_CREDENTIAL = new DefaultAzureCredential();
const STORAGE_BLOB_SERVICE_CLIENT = new BlobServiceClient(
  `https://${STORAGE_BLOB_ACCOUNT}.blob.core.windows.net`,
  DEFAULT_AZURE_CREDENTIAL
);

// GLOBALS
let WANTED_PLATES= [];

async function main() {
  // SETUP
  const platesClient = ServiceBusClient.createFromConnectionString(platesEndpoint); 
  const platesSubscription = platesClient.createSubscriptionClient(platesTopicName, platesSubscriptionKey);
  const platesReceiver = platesSubscription.createReceiver(ReceiveMode.receiveAndDelete);

  const wantedClient = ServiceBusClient.createFromConnectionString(wantedEndpoint); 
  const wantedSubscription = wantedClient.createSubscriptionClient(wantedTopicName, wantedSubscriptionKey);
  const wantedReceiver = wantedSubscription.createReceiver(ReceiveMode.receiveAndDelete);

  WANTED_PLATES = JSON.parse(fs.readFileSync('./data/wanted.json'));

  platesReceiver.registerMessageHandler(sendLicensePlates, onError);    
  wantedReceiver.registerMessageHandler(getWanted, onError);
}

function storeImage(storageName, imageData) {
  
}

async function sendLicensePlates(message) {
  const plate = message.body;

  console.log(Object.keys(plate));

  // FILTER FOUND PLATES WITH WANTED PLATES
  /*if(!WANTED_PLATES.includes(plate.LicensePlate)) {
    console.log(plate.LicensePlate + ' is not Wanted...');
    return;
  }

  // UPLOAD IMAGE BLOB
  const blobURI = "";

  // SEND THE WANTED PLATES
  let payload = {
    LicensePlateCaptureTime : plate.LicensePlateCaptureTime,
    LicensePlate            : plate.LicensePlate,
    Latitude                : plate.Latitude,
    Longitude               : plate.Longitude,
    ContextImageReference   : blobURI
  }
  
  // SEND THE REQUEST
  console.log('FOUND WANTED: ' + payload.LicensePlate);
  const response = await axios.post(
    'https://licenseplatevalidator.azurewebsites.net/api/lpr/platelocation', 
    payload,
    {
      headers: {
        Authorization: 'Basic dGVhbTAyOl0pKVhpeVJiTEtUPSlkcyE=' 
      }
    }
  );
  console.log(response.data);*/
}

async function getWanted(message) {
  console.log('NEW WANTED LIST');
  // GET WANTED PLATES
  // THIS COSTS MONEY !!!
  // DATA IN WANTED.JSON
  const plates = await axios.get('https://licenseplatevalidator.azurewebsites.net/api/lpr/wantedplates', {
    auth: {
      username: 'team02',
      password: ']))XiyRbLKT=)ds!'
    }
  });
  WANTED_PLATES = plates.data
  fs.writeFileSync('./data/wanted.json', JSON.stringify(plates.data));
}

async function onError(error) {
  console.error(error);
}

// RUN
main().catch((err) => {
  console.log("Error occurred: ", err);
});