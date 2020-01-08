var CDEX;
if (!CDEX) {
    CDEX = {};
}

(function () {
    CDEX.client = null;
    CDEX.communicationRequests = null;
    CDEX.communicationRequest = null;
    CDEX.reviewCommunication = [];

    CDEX.resources = {};

    CDEX.now = () => {
        let date = new Date();
        return date.toISOString();
    };

    CDEX.getGUID = () => {
        let s4 = () => {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        };
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    CDEX.formatDate = (date) => {
        // TODO: implement a more sensible screen date formatter that uses an ISO date parser and translates to local time
        if(date) {
            const d = date.split('T');
            if (d.length > 1) {
                return d[0] + ' ' + d[1].substring(0, 5);
            }
        }
        return date;
    }

    CDEX.displayPatient = (pt) => {
        $('#patient-name, #review-name').html(CDEX.getPatientName(pt));
    };

    CDEX.displayOrganization = (org, screen) => {
        if(org.identifier.length > 0) {
            CDEX.payerEndpoint.name = org.identifier[0].value;
            CDEX.payerEndpoint.url = org.identifier[0].system;

            $('#' + screen).append("<table><tbody><tr><td>" + org.identifier[0].system + "</td><td>" +
                org.identifier[0].value + "</td></tr></tbody></table>");
        }
    };

    CDEX.displayScreen = (screenID) => {
        $('#intro-screen').hide();
        $('#data-request-screen').hide();
        $('#review-screen').hide();
        $('#confirm-screen').hide();
        $('#communication-request-screen').hide();
        $('#preview-screen').hide();
        $('#'+screenID).show();
    };

    CDEX.displayIntroScreen = () => {
        CDEX.displayScreen('intro-screen');
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
        $("#card").empty();
        $("#final-list").empty();
        CDEX.displayScreen('review-screen');

        if (CDEX.communicationRequest.contained) {
            CDEX.communicationRequest.contained.forEach(function (containedResource) {
                if ('#' + containedResource.id === CDEX.communicationRequest.recipient[0].reference) {
                    CDEX.displayOrganization(containedResource, "card");
                }
            });
        }

        let checkboxes = $('#selection-list input[type=checkbox]');
        let checkedResources = [];
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked == true) {
                checkedResources.push(checkboxes[i].id);
            }
        }
        let docRefs = {};
        const promises = [];

        CDEX.resources.docRef.forEach(function (docRef, index) {
            if(checkedResources.includes("docRef/" + CDEX.resources.docRef[index].id)) {
                let attachment = docRef.docRefResource.content[0].attachment;
                CDEX.resources.docRef[index].results.push({
                    "url": attachment.url,
                    "contentType": attachment.contentType
                });
                let promiseConfig = {
                    "data": "",
                    "type": attachment.contentType,
                    "category": CDEX.resources.docRef[index].category,
                    "index": index,
                    "url":CDEX.providerEndpoint.url + attachment.url

                }
                if (attachment.contentType === "application/pdf") {
                    if (attachment.url) {
                        let promiseBinary = new Promise((resolve, reject) => $.ajax({
                            type: 'GET',
                            url: CDEX.providerEndpoint.url + attachment.url,
                            success: function(data) {resolve(btoa(unescape(encodeURIComponent(data))))},
                            error: function(error) {reject(error)}
                        }));

                        promiseConfig.data = promiseBinary;
                        promises.push(promiseConfig);
                    } else if (attachment.data) {
                        promiseConfig.data = attachment.data;
                        promises.push(promiseConfig);
                    }
                } else if (attachment.contentType === "application/hl7-v3+xml") {
                    let promiseBinary =  new Promise((resolve, reject) => $.ajax({
                        type: 'GET',
                        url: CDEX.providerEndpoint.url + attachment.url,
                        success: function(data) {resolve(btoa(new XMLSerializer().serializeToString(data.documentElement)))},
                        error: function(error) {reject(error)}
                    }));
                    promiseConfig.data = promiseBinary;
                    promises.push(promiseConfig);
                } else if (attachment.contentType === "application/fhir+xml") {
                    let promiseBundle;
                    promiseBundle = new Promise((resolve, reject) => $.ajax({
                        type: 'GET',
                        url: CDEX.providerEndpoint.url + attachment.url,
                        success: function(data) {resolve(btoa(JSON.stringify(data)))},
                        error: function(error) {reject(error)}
                    }));
                    promiseConfig.data = promiseBundle;
                    promises.push(promiseConfig);
                }
            }
        });
        Promise.all(promises).then(function(values) {
            values.map(element => {
                if (typeof element.data === 'object' && element.data !== null) {
                    element.data.then(function (result) {
                        CDEX.resources.docRef[element.index].results[CDEX.resources.docRef[element.index].results.length - 1].data = result;
                    });
                }else {
                    CDEX.resources.docRef[element.index].results[CDEX.resources.docRef[element.index].results.length - 1].data = element.data;
                }
                if((element.category in docRefs)){
                    docRefs[element.category].push(CDEX.resources.docRef[element.index]);
                }else{
                    docRefs[element.category] = [];
                    docRefs[element.category].push(CDEX.resources.docRef[element.index]);
                }
            })

            let tr = "";
            Object.keys(docRefs).forEach(function(key) {
                tr = "<tr> <td class='medtd'><h6>" + key +
                    "</h6></td></tr><tr><td><table><thead><th>Id</th><th>Category</th>" +
                    "<th>Created On</th></thead><tbody>";
                docRefs[key].forEach(function (data){
                    tr += "<tr><td>" + data.docRefResource.id + "</td><td>" +
                        data.docRefResource.category[0].text + "</td><td>" +
                        CDEX.formatDate(data.docRefResource.date) + "</td></tr>";
                });
                tr += "</tbody></table></td></tr>";
                $('#final-list').append(tr);
            });

            CDEX.resources.queries.forEach(function (data) {
                if (data.answers) {
                    if(checkedResources.includes("query/" + data.answers.id)) {
                        $('#final-list').append(
                            "<tr> <td class='medtd'><h6>" + data.question +
                            "</h6>" + data.answers.id + "</td></tr>");
                    } else if (data.answers[0]) {
                        if(checkedResources.includes("query/" + data.answers[0].resource.id)) {
                            $('#final-list').append(
                                "<tr> <td class='medtd'><h6>" + data.question +
                                "</h6>" + data.answers[0].resource.id + "</td></tr>");
                        }
                    }
                }
            });
        })
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
        CDEX.reviewCommunication = [];
        CDEX.resources = {
            "queries": [],
            "docRef": []
        };

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
                    CDEX.displayPatient(patients[0]);
                });
                if(communicationRequest.payload){
                    communicationRequest.payload.forEach(function (content, index) {
                        $('#selection-list').append(
                            "<tr> <td class='medtd'><b>" + content.contentString + "</b></td></tr>" +
                            "<tr><td><table><thead id='head" + index  +
                            "'></thead><tbody id='payload" + index + "'>" +
                            "<tr><td colspan='5' style='text-align:center'><img src='images/spinner.gif'" +
                            "></td></tr></tbody></table></td></tr>");
                        if(communicationRequest.payload[index].extension) {
                            if (communicationRequest.payload[index].extension[0].valueString) {
                                let promise;
                                let config = {
                                    type: 'GET',
                                    url: CDEX.providerEndpoint.url + "/" + communicationRequest.payload[index].extension[0].valueString
                                };
                                CDEX.resources.queries.push({
                                    "question": content.contentString,
                                    "valueString": communicationRequest.payload[index].extension[0].valueString,
                                    "index": index
                                });
                                promise = $.ajax(config);
                                promise.then((results) => {
                                    if (results) {
                                        $('#payload' + index).html("");
                                        if(results.total == 0){
                                            $('#payload' + index).append("<tr><td>No matching data</td></tr>");
                                        }else {
                                            if(results.entry) {
                                                CDEX.resources.queries.forEach(function (r, idx) {
                                                    if(r.index === index){
                                                        CDEX.resources.queries[idx].answers = results.entry;
                                                    }
                                                });
                                                results.entry.forEach(function (result) {
                                                    if(result.resource.text){
                                                        $('#payload' + index).append("<tr><td>" + result.resource.type.coding[0].display
                                                            + "</td><td><input type='checkbox' id=" + "query/" +
                                                            result.resource.id + "></td></tr>");
                                                    }else {
                                                        $('#payload' + index).append("<tr><td><pre>" +
                                                            JSON.stringify(result.resource, null, '\t') +
                                                            "</pre></td><td><input type='checkbox' id=" + "query/" +
                                                            result.resource.id  + "></td></tr>");
                                                    }
                                                });
                                            }else{
                                                if(results.text){
                                                    CDEX.resources.queries.forEach(function (r, idx) {
                                                        if(r.index === index){
                                                            CDEX.resources.queries[idx].answers = results;
                                                        }
                                                    });
                                                    $('#payload' + index).append("<tr><td>" + results.text.div +
                                                        "</td><td><input type='checkbox' id=" + "query/" +
                                                        results.id + "></td></tr>");
                                                }else{
                                                    $('#payload' + index).append("<tr><td><pre>" +
                                                        JSON.stringify(results, null, '\t')
                                                        + "</pre></td><td><input type='checkbox' id=" + "query/" +
                                                        results.id + "></td></tr>");
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
                                    $('#payload' + index).html("");
                                    if(documentReferences.data.entry){
                                        CDEX.reviewCommunication.push(documentReferences);
                                        let dataEntry = documentReferences.data.entry;

                                        $('#head' + index).append("<th>Id</th><th>Category</th>" +
                                            "<th>Created Date</th><th>Preview</th><th>Select</th>");
                                        dataEntry.forEach(function (docRef, docRefIndex) {
                                            CDEX.resources.docRef.push({
                                                "id": docRef.resource.id,
                                                "code": communicationRequest.payload[index].extension[0].valueCodeableConcept.coding[0].code,
                                                "docRefResource": docRef.resource,
                                                "category": content.contentString,
                                                "index": docRefIndex,
                                                "maxIndex": dataEntry.length - 1,
                                                "results": []
                                            });
                                            let idPreview = "previewId" + docRefIndex;
                                            $('#payload' + index).append("<tr><td>" + docRef.resource.id +
                                                "</td><td>" +
                                                docRef.resource.category[0].text + "</td><td>" +
                                                CDEX.formatDate(docRef.resource.date) +
                                                "</td><td id='" + idPreview + "'></td><td><input type='checkbox' id=" +
                                                "docRef/" + docRef.resource.id + "></td></tr>");

                                            const idButton = "REQ-" + idPreview;
                                            $('#' + idPreview).append("<div><a href='#' id='" + idButton + "'> preview </a></div>");
                                            $('#' + idButton).click(() => {
                                                CDEX.openPreview(docRef.resource);
                                                return false;
                                            });
                                        });
                                    }else{
                                        $('#payload' + index).append("<tr><td>No " + content.contentString + " available</td></tr>");
                                    }
                                });
                            }
                        }else{
                            $('#payload' + index).html("");
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
            $('#spinner-preview').hide();
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
                let oSerializer = new XMLSerializer();
                let sXML = oSerializer.serializeToString(binary);
                $('#spinner-preview').hide();
                $('#preview-list').append("<tr><td><textarea rows='20' cols='80' style='border:none;'>" + sXML + "</textarea></td></tr>")
            });
        }else if(attachment.contentType === "application/fhir+xml"){
            let promiseBundle;
            let config = {
                type: 'GET',
                url: CDEX.providerEndpoint.url + attachment.url
            };

            promiseBundle = $.ajax(config);
            promiseBundle.then((bundles) => {
                let bundle = bundles.entry;
                bundle.forEach(function (content) {
                    if (content.resource.text) {
                        $('#spinner-preview').hide();
                        $('#preview-list').append("<tr><td>" + content.resource.text.div + "</td></tr>");
                    }
                });
            });
        }
    };

    CDEX.addToPayload = () => {
        let checkboxes = $('#selection-list input[type=checkbox]');
        let checkedResources = [];
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked == true) {
                checkedResources.push(checkboxes[i].id);
            }
        }

        let timestamp = CDEX.now();
        let communication = CDEX.operationPayload;
        communication.authoredOn = timestamp;
        communication.basedOn[0].reference = "CommunicationRequest/" + CDEX.communicationRequest.id;
        communication.id = CDEX.getGUID();
        communication.sent = timestamp;
        let payload = [];
        let idx = 0;
        CDEX.resources.queries.forEach(function(query){
            if(query.answers) {
                let checkId = "query/";
                if(query.answers[0]){
                    checkId += query.answers[0].resource.id;
                }else{
                    checkId += query.answers.id;
                }
                if (checkedResources.includes((checkId))) {
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
                    payload[idx].extension[0].valueString = query.valueString;
                    payload[idx].contentAttachment.data = btoa(JSON.stringify(query.answers));
                    idx++;
                }
            }
        });
        CDEX.resources.docRef.forEach(function(docRef, index){
            if(checkedResources.includes("docRef/" + CDEX.resources.docRef[index].id)) {
                payload[idx] = {
                    "extension": [{
                        "url": "http://hl7.org/fhir/us/davinci-cdex/StructureDefinition/cdex-payload-clinical-note-type",
                        "valueCodeableConcept": {
                            "coding": [{
                                "system": "http://loinc.org",
                                "code": "CODE"
                            }]
                        }
                    }],
                    "contentAttachment": {
                        "contentType": "CONTENTTYPE",
                        "data": "DATA",
                        "title": "TITLE"
                    }
                };
                payload[idx].extension[0].valueCodeableConcept.coding[0].code = CDEX.resources.docRef[index].code;
                payload[idx].contentAttachment.contentType = CDEX.resources.docRef[index].docRefResource.content[0].attachment.contentType;
                payload[idx].contentAttachment.title = CDEX.resources.docRef[index].docRefResource.content[0].attachment.title;
                payload[idx].contentAttachment.data = CDEX.resources.docRef[index].results[0].data;
                idx++;
            }
        });

        communication.payload = payload;
        CDEX.operationPayload = communication;
    };

    CDEX.loadData = (client) => {
        CDEX.displayIntroScreen();
        $('#scenario-intro').html(CDEX.scenarioDescription.description);
        try {
            CDEX.client = client;
            CDEX.client.api.fetchAll(
                {type: "CommunicationRequest"
                }
            ).then(function(communicationRequests) {
                CDEX.communicationRequests = communicationRequests;
                if(communicationRequests.length) {
                    $('#communication-request-selection-list').empty();
                    CDEX.communicationRequests
                        .sort((a,b) => -1*(('' + a.authoredOn).localeCompare(b.authoredOn)))
                        .forEach(function(commReq, index){
                            if(commReq.recipient) {
                                if(commReq.contained){
                                    commReq.contained.forEach(function (containedResource) {
                                        if('#' + containedResource.id == commReq.recipient[0].reference) {
                                            if(containedResource.identifier) {
                                                $(".requester" + containedResource.id).html("<div>" +
                                                    containedResource.identifier[0].value + "</div>");
                                            }
                                        }
                                    });
                                }
                                let idName = "btnCommReq" + index;
                                let description = "";

                                if (commReq.text) {
                                    if (commReq.text.div) {
                                        description = commReq.text.div;
                                    }
                                }

                                let requester = "";
                                if (commReq.requester) {
                                    if (commReq.requester.reference[0] == '#') {
                                        requester = CDEX.grabRelativeUrlFromContained(commReq, commReq.requester.reference.slice(1))
                                    } else {
                                        requester = commReq.requester.reference;
                                    }
                                }

                                let sender = "";
                                if(commReq.sender){
                                    if (commReq.sender.reference[0] == '#') {
                                        sender = CDEX.grabRelativeUrlFromContained(commReq, commReq.sender.reference.slice(1))
                                    } else {
                                        sender = commReq.sender.reference;
                                    }
                                }

                                $('#communication-request-selection-list').append(
                                    "<tr><td class='medtd'>" + commReq.id + "</td><td class='medtd'>" + description +
                                    "</td><td class='medtd requester'>" + requester +
                                    "</td><td class='medtd requester'>" + sender + "</td><td class='medtd'>" +
                                    CDEX.formatDate(commReq.authoredOn) +
                                    "</td><td class='medtd' id='" + idName + "'></td></tr>");

                                const idButton = "COMM-" + idName;
                                $('#' + idName).append("<div><a href='#' id='" + idButton + "'> respond </a></div>");
                                $('#' + idButton).click(() => {
                                    CDEX.openCommunicationRequest(commReq.id);
                                    return false;
                                });
                            }
                        });
                }
            });
        } catch (err) {
            CDEX.displayErrorScreen("Failed to initialize communication requests menu", "Please make sure that everything is OK with request configuration");
        }
    };

    CDEX.grabRelativeUrlFromContained = (commReq, id) => {
        for (let i=0; i < commReq.contained.length; i++) {
            if (commReq.contained[i].id == id) {
                return commReq.contained[i].resourceType + '/' + commReq.contained[i].id;
            }
        }
    };

    CDEX.reconcile = () => {

        CDEX.disable('btn-submit');
        CDEX.disable('btn-edit');
        $('#btn-submit').html("<i class='fa fa-circle-o-notch fa-spin'></i> Submit Communication");

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
            url: CDEX.payerEndpoint.url + CDEX.submitEndpoint + CDEX.operationPayload.id,
            data: JSON.stringify(CDEX.operationPayload),
            contentType: "application/fhir+json"
        };

        promise = $.ajax(config);
        console.log(JSON.stringify(CDEX.operationPayload, null, 2));
        promise.then(() => {
            CDEX.displayConfirmScreen();
        }, () => CDEX.displayErrorScreen("Communication submission failed",
            "Please check the submit endpoint configuration.  You can close this window now."));
    };

    $('#btn-start').click(function (){
        CDEX.displayCommunicationRequestScreen();
    });

    $('#btn-back-comm-list').click(function (){
        $('#selection-list').empty();
        CDEX.displayCommunicationRequestScreen();
    });
    $('#btn-review').click(CDEX.displayReviewScreen);
    $('#btn-edit').click(CDEX.displayDataRequestScreen);
    $('#btn-back').click(function(){
        $('#spinner-preview').show();
        CDEX.displayDataRequestScreen();
    });
    $('#btn-submit').click(CDEX.reconcile);

    FHIR.oauth2.ready(CDEX.initialize);

}());
