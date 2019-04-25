var CDEX;
if (!CDEX) {
    CDEX = {};
}

(function () {

  CDEX.clientSettings = {
    "client_id": "3fcec06b-9b9e-48a8-aa38-d6d51f07007b",
    "scope"    : "user/*.* openid profile"
  };

  CDEX.submitEndpoint = "/Communication?_id=";

  CDEX.providerEndpoint = {
      "name": "DaVinci CDex Provider (Open)",
      "type": "open",
      "url": "https://api-v8-r4.hspconsortium.org/DaVinciCDexProvider/open"};

  CDEX.payerEndpoint = {
      "name": "DaVinci CDex Payer",
      "type": "open",
      "url": "https://api-v8-r4.hspconsortium.org/DaVinciCDexPayer/open"
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
        "sent": "2016-06-12T18:01:10-08:00",
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
