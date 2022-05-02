var CDEX;
if (!CDEX) {
    CDEX = {};
}

//config file
(function () {

  CDEX.clientSettings = {
    "client_id": "3fcec06b-9b9e-48a8-aa38-d6d51f07007b",
    "scope"    : "launch user/*.* openid profile"
  };

  CDEX.submitTaskEndpoint = "/Task/";

  CDEX.providerEndpoint = {
      "name": "DaVinci CDex Provider (Open)",
      "type": "open",
      "url": "https://api.logicahealth.org/DaVinciCDexProvider/open"
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

  CDEX.outcome = {
    "type": {
      "coding": [
        {
          "system": "http://hl7.org/fhir/us/davinci-hrex/CodeSystem/hrex-temp",
          "code": "data-value"
        }
      ]
    },
    "valueReference": {
      "reference": "REF"  //"#results" or "http://example.org/new-payer/fhir/DocumentReference/727A23K5133"
    }
  };
}());
