const { ServiceBusClient, ReceiveMode } = require("@azure/service-bus"); 
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const axios = require('axios');
const fs = require('fs');

// CONSTANTS
const platesEndpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=ConsumeReads;SharedAccessKey=VNcJZVQAVMazTAfrssP6Irzlg/pKwbwfnOqMXqROtCQ=";
const platesTopicName = "licenseplateread"; 
const platesSubscriptionKey = "lljogbgtkpoozqvj"; 

const wantedEndpoint = "Endpoint=sb://licenseplatepublisher.servicebus.windows.net/;SharedAccessKeyName=listeneronly;SharedAccessKey=w+ifeMSBq1AQkedLCpMa8ut5c6bJzJxqHuX9Jx2XGOk=";
const wantedTopicName = "wantedplatelistupdate"; 
const wantedSubscriptionKey = "lljogbgtkpoozqvj"; 

const account  = "contextimagereferences";
const accountKey = "/ki/v3fcxbtN9XPzlBe3yNybCZQRONQOm7hMqLx7GKxPyRZa/t+fW+y8kjOWzIGrenDwo52eeAOdrPk+BQpv4Q==";
const containerName = "contextimages";

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient  = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`, 
  sharedKeyCredential
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

  // REGISTER LISTENERS
  platesReceiver.registerMessageHandler(sendLicensePlates, onError);    
  wantedReceiver.registerMessageHandler(getWanted, onError);
}

async function storeImage(plate, data) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
 
  const content = data;
  const blobName = plate;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const uploadBlobResponse = await blockBlobClient.upload(content, content.length);

  console.log("Image Upload Successful");
  
  return "https://contextimagereferences.blob.core.windows.net/contextimages/" + plate
}

async function sendLicensePlates(message) {
  const plate = message.body;
  
  // FILTER FOUND PLATES WITH WANTED PLATES
  if(!WANTED_PLATES.includes(plate.LicensePlate)) {
    console.log(plate.LicensePlate + ' is not Wanted...');
    return;
  }
  
  // UPLOAD IMAGE BLOB
  const blobURI = await storeImage(plate.LicensePlate, plate.ContextImageJpg);

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
  console.log(response.data);
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