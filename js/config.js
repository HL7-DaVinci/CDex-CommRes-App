var CDEX;
if (!CDEX) {
    CDEX = {};
}

//config file
(function () {

  CDEX.clientSettings = {
    "client_id": "0d52a72e-7de9-4a48-aed9-6467c087621e", // "3fcec06b-9b9e-48a8-aa38-d6d51f07007b",
    "scope"    : "user/*.* openid profile"
  };

  CDEX.submitEndpoint = "/Communication/";

  CDEX.providerEndpoint = {
      "name": "DaVinci CDex Provider (Open)",
      "type": "open",
      "url": "https://api-v8-r4.hspconsortium.org/DaVinciCDexProvider/open"};

  CDEX.payerEndpoint = {
      "name": "DaVinci CDex Payer",
      "type": "open",
      "url": "https://api-v8-r4.hspconsortium.org/DaVinciCDexPayer/open"
  };

  CDEX.scenarioDescription = {
      "description" : "Lorem ipsum dolor sit amet, consectetur adipiscing elit,\n" +
          "            sed do eiusmod tempor incididunt ut labore et dolore magna\n" +
          "            aliqua. Ut enim ad minim veniam, quis nostrud exercitation\n" +
          "            ullamco laboris nisi ut aliquip ex ea commodo consequat.\n" +
          "            Duis aute irure dolor in reprehenderit in voluptate velit\n" +
          "            esse cillum dolore eu fugiat nulla pariatur. Excepteur sint\n" +
          "            occaecat cupidatat non proident, sunt in culpa qui officia\n" +
          "            deserunt mollit anim id est laborum."
  };

  CDEX.operationPayload = {
        "resourceType": "Communication",
        "id": "COMMUNICATION_ID",
        "text": {
            "status": "generated",
            "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\">Query response to a Request</div>"
        },
        "identifier": [
            {
                "system": "http://www.providerco.com/communication",
                "value": "12345"
            }
        ],
        "basedOn": [
            {
                "reference": "CommunicationRequest/ID"
            }
        ],
        "status": "completed",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://acme.org/messagetypes",
                        "code": "SolicitedAttachment"
                    }
                ]
            }
        ],
        "subject": {
            "reference": "Patient/cdex-example-patient"
        },
        "sent": "SENTDATE",
        "recipient": [
            {
                "reference": "Organization/cdex-example-payer"
            }
        ],
        "sender": {
            "reference": "Organization/cdex-example-provider"
        },
        "payload": ["PAYLOAD"]
  };
}());
