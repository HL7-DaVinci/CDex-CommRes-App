var CDEX;
if (!CDEX) {
    CDEX = {};
}

(function () {
    CDEX.client = null;
    CDEX.communicationRequests = null;
    CDEX.communicationRequest = null;
    CDEX.now = () => {
        let date = new Date();
        return date.toISOString();
    };

    CDEX.displayPatient = (pt, screen) => {
        $('#' + screen).html(CDEX.getPatientName(pt));
    };

    CDEX.displayOrganization = (org, screen) => {
        $('#' + screen).append("<table><tbody><tr><td>" + org.identifier[0].system + "</td><td>" +
            org.identifier[0].value + "</td></tr></tbody></table>");
    };

    CDEX.displayScreen = (screenID) => {
        $('#data-request-screen').hide();
        $('#review-screen').hide();
        $('#confirm-screen').hide();
        $('#communication-request-screen').hide();
        $('#preview-screen').hide();
        $('#'+screenID).show();
    };

    CDEX.displayPreviewScreen = () => {
        $("#preview-list").empty();
        CDEX.displayScreen('preview-screen');
    };

    CDEX.displayCommunicationRequestScreen = () => {
        CDEX.displayScreen('communication-request-screen');
    };

    CDEX.displayDataRequestScreen = () => {
       CDEX.displayScreen('data-request-screen');
    };

    CDEX.displayConfirmScreen = () => {
        CDEX.displayScreen('confirm-screen');
    };

    CDEX.displayReviewScreen = () => {
        $("card").empty();
        let sender = CDEX.communicationRequest.sender.reference.split("/");
        CDEX.client.api.fetchAll(
            {
                type: "Organization",
                query: {
                    _id: sender[1]
                }
            }
        ).then(function (organization) {
            CDEX.displayOrganization(organization[0], "card");
        });
        CDEX.client.api.fetchAll(
            {
                type: "Patient",
                query: {
                    _id: CDEX.communicationRequest.subject.reference
                }
            },
            ["Patient.patientReference"]
        ).then(function (patients) {
            CDEX.displayPatient(patients[0], "review-name");
        });
        if (CDEX.communicationRequest.payload) {
            CDEX.communicationRequest.payload.forEach(function (content, index) {
                $('#final-list').append(
                    "<tr> <td class='medtd'>" + content.contentString +
                    "</td></tr><tr><td><table><tbody id='finalPayload" + index + "'></tbody></table></td></tr>");
                if (CDEX.communicationRequest.payload[index].extension) {
                    if (CDEX.communicationRequest.payload[index].extension[0].valueString) {
                        let promise;
                        let config = {
                            type: 'GET',
                            url: CDEX.providerEndpoint.url + "/" + CDEX.communicationRequest.payload[index].extension[0].valueString
                        };

                        promise = $.ajax(config);
                        promise.then((results) => {
                            if (results) {
                                if(results.total == 0){
                                    $('#finalPayload' + index).append("<tr><td>No matching data</td></tr>");
                                }else {
                                    if(results.entry) {
                                        results.entry.forEach(function (result) {
                                            if(result.resource.text){
                                                $('#finalPayload' + index).append("<tr><td>" + result.resource.text.div + "</td></tr>");
                                            }else {
                                                $('#finalPayload' + index).append("<tr><td><pre>" + JSON.stringify(result.resource, null, '\t') + "</pre></td></tr>");
                                            }
                                        });
                                    }else{
                                        if(results.text){
                                            $('#finalPayload' + index).append("<tr><td>" + results.text.div + "</td></tr>");
                                        }else{
                                            $('#finalPayload' + index).append("<tr><td><pre>" + JSON.stringify(results, null, '\t') + "</pre></td></tr>");
                                        }
                                    }
                                }
                            }
                        });
                    } else if (CDEX.communicationRequest.payload[index].extension[0].valueCodeableConcept) {
                        CDEX.client.api.fetchAll(
                            {
                                type: "DocumentReference",
                                query: {
                                    type: CDEX.communicationRequest.payload[index].extension[0].valueCodeableConcept.coding[0].code
                                }
                            }
                        ).then(function (documentReferences) {
                            if (documentReferences.length) {
                                documentReferences.forEach(function (docRef) {
                                    $('#finalPayload' + index).append("<tr><td>" + docRef.id +
                                        "</td><td>" + docRef.author[0].display + "</td><td>" +
                                        docRef.subject.reference + "</td><td>" + docRef.category[0].text +
                                        "</td></tr>");
                                });
                            } else {
                                $('#finalPayload' + index).append("<tr><td>No " + content.contentString + " available</td></tr>");
                            }
                        });
                    }
                }
            });
        }
        CDEX.displayScreen('review-screen');
    }

    CDEX.displayErrorScreen = (title, message) => {
        $('#error-title').html(title);
        $('#error-message').html(message);
        CDEX.displayScreen('error-screen');
    }

    CDEX.disable = (id) => {
        $("#"+id).prop("disabled",true);
    };

    CDEX.getPatientName = (pt) => {
        if (pt.name) {
            let names = pt.name.map((n) => n.given.join(" ") + " " + n.family);
            return names.join(" / ");
        } else {
            return "anonymous";
        }
    };

    CDEX.openCommunicationRequest = (commRequestId) => {
        CDEX.displayDataRequestScreen();
        CDEX.communicationRequests.forEach(function(communicationRequest) {
            if(communicationRequest.id === commRequestId) {
                CDEX.communicationRequest = communicationRequest;
                 CDEX.client.api.fetchAll(
                    {type: "Patient",
                        query: {
                            _id: communicationRequest.subject.reference
                        }
                    },
                    [ "Patient.patientReference" ]
                ).then(function(patients) {
                    CDEX.displayPatient(patients[0], "patient-name");
                });
                if(communicationRequest.payload){
                    communicationRequest.payload.forEach(function (content, index) {
                        $('#selection-list').append(
                            "<tr> <td class='medtd'>" + content.contentString +
                            "</td></tr>" + "<tr><td><table><tbody id='payload" + index + "'></tbody></table></td></tr>");
                        if(communicationRequest.payload[index].extension) {
                            if (communicationRequest.payload[index].extension[0].valueString) {
                                let promise;
                                let config = {
                                    type: 'GET',
                                    url: CDEX.providerEndpoint.url + "/" + communicationRequest.payload[index].extension[0].valueString
                                };

                                promise = $.ajax(config);
                                promise.then((results) => {
                                    if (results) {
                                        if(results.total == 0){
                                            $('#payload' + index).append("<tr><td>No matching data</td></tr>");
                                        }else {
                                            if(results.entry) {
                                                results.entry.forEach(function (result) {
                                                    if(result.resource.text){
                                                        $('#payload' + index).append("<tr><td>" + result.resource.text.div + "</td></tr>");
                                                    }else {
                                                        $('#payload' + index).append("<tr><td><pre>" + JSON.stringify(result.resource, null, '\t') + "</pre></td></tr>");
                                                    }
                                                });
                                            }else{
                                                if(results.text){
                                                    $('#payload' + index).append("<tr><td>" + results.text.div + "</td></tr>");
                                                }else{
                                                $('#payload' + index).append("<tr><td><pre>" + JSON.stringify(results, null, '\t') + "</pre></td></tr>");
                                                }
                                            }
                                        }
                                    }
                                });
                            }else if(communicationRequest.payload[index].extension[0].valueCodeableConcept){
                                CDEX.client.api.fetchAllWithReferences(
                                    {type: "DocumentReference",
                                        query: {
                                            type: communicationRequest.payload[index].extension[0].valueCodeableConcept.coding[0].code
                                        }
                                    }
                                ).then(function(documentReferences) {
                                    if(documentReferences.data.entry){
                                        let d = documentReferences.data.entry;
                                        d.forEach(function (docRef, docRefIndex) {
                                            let idButton = "previewId" + docRefIndex;
                                            $('#payload' + index).append("<tr><td>" + docRef.resource.id +
                                                "</td><td>" + docRef.resource.author[0].display + "</td><td>" +
                                                docRef.resource.subject.reference + "</td><td>" + docRef.resource.category[0].text +
                                                "</td><td><button type='button' class='btn btn-secondary' id='" + idButton +
                                                "'>Preview</button></td></tr>");
                                            $('#' + idButton).click(() => {
                                                CDEX.openPreview(docRef.resource)
                                            });
                                        });
                                    }else{
                                        $('#payload' + index).append("<tr><td>No " + content.contentString + " available</td></tr>");
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    };

    CDEX.openPreview = (docRef) => {
        let attachment = docRef.content[0].attachment;

        CDEX.displayPreviewScreen();

        const displayBlob = (blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const blobType = blob.type;
            $('#preview-list').append("<p><object data='" + blobUrl + "' type='" + blobType + "' width='100%' height='600px' /></p>");
        }

        // based on https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
        const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
            const byteCharacters = atob(b64Data);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);
            
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
                }
            
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            
            const blob = new Blob(byteArrays, {type: contentType});
            return blob;
        }

        if (attachment.contentType === "application/pdf") {
            if (attachment.url) {
                CDEX.client.fetchBinary(attachment.url).then(displayBlob);
            } else if (attachment.data) {
                const blob = b64toBlob(attachment.data, "application/pdf");
                displayBlob(blob);
            }
        }
        else if(attachment.contentType === "application/hl7-v3+xml"){
            let promiseBinary;
            let config = {
                type: 'GET',
                url: CDEX.providerEndpoint.url + attachment.url
            };

            promiseBinary = $.ajax(config);
            promiseBinary.then((binary) => {
                console.log(binary);
            });
        }else if(attachment.contentType === "application/fhir+xml"){
            let promiseBundle;
            let config = {
                type: 'GET',
                url: CDEX.providerEndpoint.url + attachment.url
            };

            promiseBundle = $.ajax(config);
            promiseBundle.then((bundles) => {
                console.log(bundles);
                let bundle = bundles.entry;
                bundle.forEach(function (content) {
                    if (content.resource.text) {
                        $('#preview-list').append("<tr><td>" + content.resource.text.div + "</td></tr>");
                    }
                });
            });
        }
    }

    CDEX.addToPayload = () => {
        let timestamp = CDEX.now();
        let communication = CDEX.operationPayload;
        communication.authoredOn = timestamp;
        communication.basedOn[0].reference = CDEX.communicationRequest.id;
        let payload = [];

        let checkboxes = $('#selection-list input[type=checkbox]');
        let checkedRequests = [];
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked == true) {
                checkedRequests.push(checkboxes[i].id);
            }
        }

        if (CDEX.communicationRequest.payload) {
            let idx = 0;
            CDEX.communicationRequest.payload.forEach(function (content, index) {
                if (checkedRequests.includes("Resource" + index)) {
                    if (CDEX.communicationRequest.payload[index].extension) {
                        if (CDEX.communicationRequest.payload[index].extension[0].valueString) {
                            let promise;
                            let config = {
                                type: 'GET',
                                url: CDEX.providerEndpoint.url + "/" + CDEX.communicationRequest.payload[index].extension[0].valueString
                            };
                            let data = "";
                            promise = $.ajax(config);
                            promise.then((results) => {
                                if (results) {
                                    data = results.link.url;
                                }
                            });
                            payload[idx] = {
                                "extension": [
                                    {
                                        "url": "http://hl7.org/fhir/us/davinci-cdex/StructureDefinition/cdex-payload-query-string",
                                        "valueString": "VALUESTRING"
                                    }
                                ],
                                "contentAttachment": {
                                    "contentType": "application/fhir+xml",
                                    "data": "DATA"
                                }
                            }
                            payload[idx].extension[0].valueString = CDEX.communicationRequest.payload[index].extension[0].valueString;
                            payload[idx].contentAttachment.data = data;


                        }else if(CDEX.communicationRequest.payload[index].extension[0].valueCodeableConcept){

                        }
                    }else{

                    }
                    idx ++;
                }
            });
        }
        communication.payload = payload;
        CDEX.operationPayload = communication;
    };

    CDEX.loadData = (client) => {
        try {
            CDEX.client = client;
            CDEX.displayCommunicationRequestScreen();

            CDEX.client.api.fetchAll(
                {type: "CommunicationRequest"
                }
            ).then(function(communicationRequests) {
                CDEX.communicationRequests = communicationRequests;
                if(communicationRequests.length) {
                    CDEX.communicationRequests.forEach(function(commReq, index){
                        if(commReq.sender) {
                            let organization = commReq.sender.reference.split("/");
                            CDEX.client.api.fetchAll(
                                {
                                    type: "Organization",
                                    query: {
                                        _id: organization[1]
                                    }
                                },
                                ["Patient.patientReference"]
                            ).then(function (org) {
                                $( ".requester" + org[0].id).html("<div>" + org[0].identifier[0].value + "</div>");
                            });
                            let idName = "btnCommReq" + index;
                            let description = "";

                            if (commReq.text) {
                                if (commReq.text.div) {
                                    description = commReq.text.div;
                                }
                            }
                            let senderClass = "";
                            if(commReq.sender){
                                let organization = commReq.sender.reference.split("/");
                                senderClass = organization[organization.length - 1];
                            }
                            $('#communication-request-selection-list').append(
                                "<tr><td class='medtd'>" + commReq.id + "</td><td class='medtd'>" + description +
                                "</td><td class='medtd requester" + senderClass + "'></td><td class='medtd'>" +
                                commReq.authoredOn + "</td><td class='medtd'><button type='button' class='btn btn-secondary' id='" +
                                idName + "' >Select</button></td></tr>");

                            $('#' + idName).click(() => {
                                CDEX.openCommunicationRequest(commReq.id)
                            });
                        }
                    });
                }
            });
        } catch (err) {
            CDEX.displayErrorScreen("Failed to initialize communication requests menu", "Please make sure that everything is OK with request configuration");
        }
    };

    CDEX.reconcile = () => {

        CDEX.disable('btn-submit');
        CDEX.disable('btn-edit');
        $('#btn-submit').html("<i class='fa fa-circle-o-notch fa-spin'></i> Submit Communication Request");

        CDEX.addToPayload();
        CDEX.finalize();
    };

    CDEX.initialize = (client) => {
        if (sessionStorage.operationPayload) {
            if (JSON.parse(sessionStorage.tokenResponse).refresh_token) {
                // save state in localStorage
                let state = JSON.parse(sessionStorage.tokenResponse).state;
                localStorage.tokenResponse = sessionStorage.tokenResponse;
                localStorage[state] = sessionStorage[state];
            }
            CDEX.operationPayload = JSON.parse(sessionStorage.operationPayload);
            CDEX.providerEndpoint.accessToken = JSON.parse(sessionStorage.tokenResponse).access_token;
            CDEX.finalize();
        } else {
            CDEX.loadData(client);
        }
    };

    CDEX.finalize = () => {
        let promise;
        let config = {
            type: 'PUT',
            url: CDEX.payerEndpoint.url + CDEX.submitEndpoint + CDEX.operationPayload.id + "$submit-data",
            data: JSON.stringify(CDEX.operationPayload),
            contentType: "application/fhir+json"
        };

        promise = $.ajax(config);

        promise.then(() => {
            CDEX.displayConfirmScreen();
        }, () => CDEX.displayErrorScreen("Communication submission failed", "Please check the submit endpoint configuration. \n You can close this window now."));
    };

    $('#btn-review').click(CDEX.displayReviewScreen);
    $('#btn-edit').click(CDEX.displayDataRequestScreen);
    $('#btn-back').click(CDEX.displayDataRequestScreen);
    $('#btn-submit').click(CDEX.reconcile);

    FHIR.oauth2.ready(CDEX.initialize);

}());
