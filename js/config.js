var CDEX;
if (!CDEX) {
    CDEX = {};
}

//config file
(function () {

  CDEX.clientSettings = {
    "client_id": "3fcec06b-9b9e-48a8-aa38-d6d51f07007b",
    "scope"    : "user/*.* openid profile"
  };

  CDEX.submitEndpoint = "/Communication/";

  CDEX.providerEndpoint = {
      "name": "DaVinci CDex Provider (Open)",
      "type": "open",
      "url": "https://api.logicahealth.org/DaVinciCDexProvider/open"};

  CDEX.payerEndpoint = {
      "name": "DaVinci CDex Payer",
      "type": "open",
      "url": "https://api.logicahealth.org/DaVinciCDexPayer/open"
  };

  CDEX.scenarioDescription = {
      "description" : "In this scenario, the user works for a provider and wishes to\n" +
          "            review and respond to information requests from a payer.\n" +
          "            The user will review the payer requests, preview the data\n" +
          "            and confirm what data will be included in the response. In\n" +
          "            this example application, the user reviews the data prior to\n" +
          "            responding. In a production system, this review could be automated\n" +
          "            in order to minimize manual review."
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
