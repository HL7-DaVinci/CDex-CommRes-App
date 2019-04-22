var CDEX;
if (!CDEX) {
    CDEX = {};
}

(function () {

  CDEX.clientSettings = {
    "client_id": "3fcec06b-9b9e-48a8-aa38-d6d51f07007b",
    "scope"    : "user/*.* openid profile"
  };

  CDEX.submitEndpoint = "/CommunicationRequest/cdex-example-solicited-attachment-request/$submit-data";

  CDEX.providerEndpoints = [{
      "name": "DaVinci CDex Provider (Open)",
      "type": "open",
      "url": "https://api-v8-r4.hspconsortium.org/DaVinciCDexProvider/open"}
  ];

  // default configuration
  CDEX.configSetting = 0; // HSPC Payer Demo (Open)
  CDEX.providerEndpoint = CDEX.providerEndpoints[CDEX.configSetting];

  CDEX.menuData = [
        {"name": "Observation",
         "FHIRQueryString": "Observation?category=vital-signs"},
        {"name": "Encounter",
        "FHIRQueryString": "Encounter"}
    ];

  CDEX.operationPayload = {
      "resourceType": "Parameters",
      "id": "OPERATIONID",
      "parameter": [
        {
          "name": "cdex-example-solicited-attachment-request",
          "resource": {
              "resourceType": "CommunicationRequest",
              "id": "cdex-example-solicited-attachment-request",
              "identifier": [
                  {
                      "system": "http://www.jurisdiction.com/insurer/123456",
                      "value": "ABC123",
                      "_value": {
                          "fhir_comments": [
                              "  this is the value to which the response will refer  "
                          ]
                      }
                  }
              ],
              "groupIdentifier": {
                  "value": "12345"
              },
              "status": "active",
              "category": [
                  {
                      "coding": [
                          {
                              "system": "http://acme.org/messagetypes",
                              "code": "SolicitedAttachmentRequest"
                          }
                      ]
                  }
              ],
              "priority": "routine",
              "medium": [
                  {
                      "coding": [
                          {
                              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationMode",
                              "code": "WRITTEN",
                              "display": "written"
                          }
                      ],
                      "text": "written"
                  }
              ],
              "subject": {
                  "reference": "Patient/cdex-example-patient"
              },
              "about": [
                  {
                      "reference": "Claim/cdex-example-claim"
                  }
              ],
              "encounter": {
                  "reference": "Encounter/cdex-example-encounter"
              },
              "payload": [],
              "occurrenceDateTime": "2016-06-10T11:01:10-08:00",
              "authoredOn": "",
              "requester": {
                  "reference": "Practitioner/cdex-example-practitioner"
              },
              "recipient": [
                  {
                      "reference": "Organization/cdex-example-provider"
                  }
              ],
              "sender": {
                  "reference": "Organization/cdex-example-payer"
              }
          }
        }
      ]
  };

}());
