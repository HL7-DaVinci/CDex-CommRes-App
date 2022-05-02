var CDEX;
if (!CDEX) {
    CDEX = {};
}

(function () {
    CDEX.client = null;
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
                element.category = "Documents";
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

    CDEX.enable = (id) => {
        $("#"+id).prop("disabled",false);
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

        $('#selection-list').html('');

        CDEX.displayDataRequestScreen();

        CDEX.tasks.forEach(function(task) {
            if(task.id === commRequestId) {
                CDEX.operationTaskPayload = task;
            }
        });
                CDEX.client.api.fetchAll(
                    {type: "Patient",
                        query: {
                            _id: CDEX.operationTaskPayload.for.reference
                        }
                    },
                    [ "Patient.patientReference" ]
                ).then(function(patients) {
                    CDEX.displayPatient(patients[0]);
                });
                if(CDEX.operationTaskPayload.input){
                    CDEX.operationTaskPayload.input.forEach(function (content, index) {

                        let description = "";
                        let code = null;
                        let query = null;

                        if (content.valueString) {
                            description = "Query: " + content.valueString;
                            if (content.text) description += " (" + content.text + ")";
                            query = content.valueString;
                        } else if (content.valueCodeableConcept.coding[0].code) {
                            description = "Documents of type LOINC " + content.valueCodeableConcept.coding[0].code;
                            if (content.valueCodeableConcept.text) description += " (" + content.valueCodeableConcept.text + ")";
                            code = content.valueCodeableConcept.coding[0].code;
                        }                        

                        $('#selection-list').append(
                            "<tr> <td class='medtd'><b>" + description + "</b></td></tr>" +
                            "<tr><td><table><thead id='head" + index  +
                            "'></thead><tbody id='payload" + index + "'>" +
                            "<tr><td colspan='5' style='text-align:center'><img src='images/spinner.gif'" +
                            "></td></tr></tbody></table></td></tr>");

                        if (query) {
                            let promise;
                            let config = {
                                type: 'GET',
                                url: CDEX.providerEndpoint.url + "/" + query
                            };
                            CDEX.resources.queries.push({
                                "question": description,
                                "valueString": query,
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
                                                    $('#payload' + index).append("<tr><td><div class='div-resource'>" +
                                                        result.resource.resourceType + ": " + result.resource.code.coding[0].display +
                                                        "</div></td><td><input type='checkbox' id=" + "query/" +
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
                        }else if(code){
                            CDEX.client.api.fetchAllWithReferences(
                                {type: "DocumentReference",
                                    query: {
                                        type: code
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
                                            "code": code,
                                            "docRefResource": docRef.resource,
                                            "category": "", // CONTENT STRING HERE
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
                    });
                }
        ;
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
                    query.answers.map((e) => e.resource).forEach((r) => {
                        payload[idx] = r;
                        idx++;
                    });
                }
            }
        });
        CDEX.resources.docRef.forEach(function(docRef, index){
            if(checkedResources.includes("docRef/" + CDEX.resources.docRef[index].id)) {
                payload[idx] = docRef.docRefResource;
                idx++;
            }
        });

        let task = CDEX.operationTaskPayload;

        if (payload.length === 0) {
            task.status = "failed";
            task.businessStatus = {"text": "No matching results"};
            task.statusReason = {"text": "No matching results"};
        } else {
            task.status = "completed";
            delete task.businessStatus;

            if ($('#chk-method').is(':checked')) {
                task.output = [{
                    "type": {
                        "coding": [{
                            "system": "http://hl7.org/fhir/us/davinci-hrex/CodeSystem/hrex-temp",
                            "code": "data-value"
                        }]
                    },
                    "valueReference": {
                        "reference": "#results"
                    }
                }];
        
                task.contained = [{
                    "resourceType": "Bundle",
                    "id": "results",
                    "type": "searchset",
                    "entry": []
                }];
        
                payload.forEach((e) => {
                    task.contained[0].entry.push ({
                        "fullUrl": CDEX.providerEndpoint.url + "/" + e.resourceType + "/" + e.id,
                        "resource": e,
                        "search": {
                          "mode": "match"
                        }
                      });
                    if (task.input[2].valueBoolean) {
                        let signature = {
                            "signature": {
                                "type": [
                                  {
                                    "system": "urn:iso-astm:E1762-95:2013",
                                    "code": "1.2.840.10065.1.12.1.5",
                                    "display": "Verification Signature"
                                  }
                                ],
                                "when": timestamp,
                                "who": {
                                  "reference": CDEX.providerEndpoint.url + "/Practitioner/" + e.id
                                },
                                "onBehalfOf": {
                                  "reference": CDEX.providerEndpoint.url + "/Organization/" + e.id
                                },
                                "data": "ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXQwZVNJNklsSlRJaXdpZEhsd0lqb2lTbGRVSWl3aWRYTmxJam9pYzJsbklpd2llRFZqSWpwYklrMUpTVVV6ZWtORFFUQmxaMEYzU1VKQlowbEtRVTlMUmxsMlRYZFNLM2xSVFVFd1IwTlRjVWRUU1dJelJGRkZRa04zVlVGTlNVZE9UVkZ6ZDBOUldVUldVVkZIUlhkS1ZsVjZSVlJOUWtWSFFURlZSVU5CZDB0Uk1rWnpZVmRhZG1OdE5YQlpWRVZUVFVKQlIwRXhWVVZDZDNkS1ZUSkdNV015Um5OaFdGSjJUVkpWZDBWM1dVUldVVkZMUkVGNFNWcFhSbk5rUjJoc1VrZEdNRmxVUlhoR2VrRldRbWRPVmtKQlRVMUVhMVo1WVZkTloxTkhSbWhqZVhkblVrWmFUazFUVlhkSmQxbEtTMjlhU1doMlkwNUJVV3RDUm1oYWJHRkhSbWhqTUVKdldsZEdjMlJIYUd4YVIwWXdXVlJGZFdJelNtNU5RalJZUkZSSmVFMVVRWGxPZWtVelRrUkpkMDVHYjFoRVZFbDVUVlJCZVUxcVJUTk9SRWwzVGtadmQyZFpNSGhEZWtGS1FtZE9Wa0pCV1ZSQmJGWlVUVkpOZDBWUldVUldVVkZKUkVGd1JGbFhlSEJhYlRsNVltMXNhRTFTU1hkRlFWbEVWbEZSU0VSQmJGUlpXRlo2V1ZkNGNHUkhPSGhHVkVGVVFtZE9Wa0pCYjAxRVJXaHNXVmQ0TUdGSFZrVlpXRkpvVFZSRldFMUNWVWRCTVZWRlFYZDNUMUpZU25CWmVVSkpXVmRHZWt4RFFrVldhekI0U2xSQmFrSm5hM0ZvYTJsSE9YY3dRa05SUlZkR2JWWnZXVmRHZWxGSGFHeFpWM2d3WVVkV2ExbFlVbWhOVXpWMlkyMWpkMmRuUjJsTlFUQkhRMU54UjFOSllqTkVVVVZDUVZGVlFVRTBTVUpxZDBGM1oyZEhTMEZ2U1VKblVVUndTMk5UYTI5QlRUWnpWekl4SzNaWFZHVkpWazlIZURFd1RWZGhjMUY1TjFaSWFXUTJlbmx4V0VGQ1RTdDZibVpDYmxobGJubFZNR294UmxSMlVHMVNaazlFYjA5RVdGWjFVRlYzUkc5dGFFTklhQ3RpWTJ4WE9VdE5NbTgxTmpOamVGSkxSWFpDYm1GSWNuTnFkelY1VG0xNFR6Vlpha1ZTWW1oMFNHUlJaWEZyZEdSM00xWlpSVkpTT1VodmVFeFBNMFpyYzNwU01qa3lTRlJDTkhoWE0zbFhiRll6WjFSclRWRnZlbEJUWTBwTFNETmlSemhRY1hFMlFWbFFTamRETkZsQ1NXeFZVMlJDVFZac00zRnVaVVZtWnpkbWRYaHBSbVpZYjJaa1ZGWnROM0pOYVdsSE4xZzVlalF6VUdacGJIRmhaV2x6Wm0xMFVuaEJiRkozUlU1WWNrZ3pUM1pQUkZCNVREQnlWRzVIT0VOellrRllXVlpKVFcxa1pFaGxORnBHT1hCc2FEazFjMm8wY0UxVWFFeDBZMHBZTDI4NVdFaE1hbWczUlcxYWVXZEtTRmRGVVhFMFVIZEdkMXBrYldKalptaERiVTl5T0RoSU9FSmlWWEoxTHpkV05ucGljMGN4VGpGRFYyeHVaR3hpVm5wdVRDc3pTVTFQY2pocldHRklZMkZ1Y1daamEyZEdWalJGY201bWFrWktjVEZQU1dGQmJYTk5hamcxZUUxcmFubFlUSGxqVEV3dmRUVnVNbTgyUW1jNU15OVZVbVp4ZFU5dlUwbEhUME5TTWpWRVlWcDZjSGN5YXpOek4yOUZPV1JOZDBWWFdIUm1XR2RaZEdneVlteHFlVFYwUmtnd1IycHdUMnQ0TURkcU4xcFVOVWh1ZUc1c2MwTkJkMFZCUVdGT1FVMUVOSGRFUVZsRVZsSXdWRUpCVlhkQmQwVkNMM3BCVEVKblRsWklVVGhGUWtGTlEwSmxRWGRKVVZsRVZsSXdVa0pDYjNkSFNVbFhaRE5rTTB4dGFHeFpWM2d3WVVkV2ExbFlVbWhoVnpWcVRHMU9kbUpVUVU1Q1oydHhhR3RwUnpsM01FSkJVWE5HUVVGUFEwRlpSVUZEZFUxVlRuRTVZWGtySzJVMVdVTTNVVVpQT1RSeVpucDRSMUZ1UmpOSGEyeGFUa0ZZYlVseU4xQldSMlJwUjFreVIxUjRMemxTZEVoRGQxUkxlbXRNSzNsMlMyOXFaVm81WkZaTE9IZHlSMVpwVW10UEwycFZlVm9yUzJOWFVtOXJWV3B6TlRsdVkwcEhVazFUVTFKNGRHVkRVWFZxZERSb1pqSXJMM0ZXSzJZeWMwMVJkRVZ5ZDFCRk16QjJZbkZTV1ZWT1RrNUNWa1ZSY0dGUmVDOWhZMHBFVlhZNWRqZHpha2hwU2tSeFdIZFJLM0o2YWprMWFVaEJTV0ZsUlVoeFJpOU5jekl5Y0RKaVpWcDFjWFpKVVV0bFRXd3JjM1pXY1VoMGFYVjZWMjVHTkZVMlZrbHRjR3R5TkdKSWJEZGxaMVk1U0Rac05sUXlVMDFyYWpaeFJGVTFaVGxPWnpCYWJFeFVkRzl6YzJoQ1RHMXZjRVkzWlRkSWVYSlVSVUZ0Wms5UVMxRmxNRVZuT1VVeWRYSjZlSEZDZFVjMU5HczFNRWN5U2pCR2FWQnpVVXBCYUVacFRrZDNVMmMwVXpOSWVWWkVSemQxWlV0a01FdzVNM2RMVDA1UFdVZDJUVXRwZWtOSVFpdHdTM1pGVFVwdldqaDVPWFZwUWl0SVJsaGpjRGxTWVVweFNqazNTSEJhVkVWMksyeHBRM0F5VUZOWWVtTkxNSEl5TlZOamVXcEdObVJNYjNWTE1sTkNNekI0UVhaS09IUkZOVGcwSzJweFVUWkRSMlZqVlRsWWFuWnNRV3AxU21SRGNrUmxWbEJ6YW10dU4wOVFXRWNyT0ZoYVZUZDZjVWhhVG0xWVdERlpXVFJJTlhKblJVbzBPR3h5VlhKUU0wazRVaUpkZlEuLm41QzBndGRrUkY5TGpDSHAyT1ZCUEl6UDI5N05oYUZyekNZUXA0QWRERWkya25aN2wtNHViRW5wbzgzZ1o5OGFOTGM5ZncwY1Y5Sm9yLUVYcUx2em44MjVjeUFvbnlKU0tteFhWcEt6SU9wV25kNUJjV3lpSUpjOXRoV2NoVkUxUHpMMUhzNjVjaTIzeWZXNlpvbjVzX3htVlN1NkZmT2N1UzNlWnlMOEFQVW9RMDAxdlB4QmR4bkRLNDg2ZFR0dGhHMExjdUl5V1c5Y0NZOTZabDRGWUJ4eDIwdjl6RkVQOW14UXE3Y2V4bGQyY210bmRhYTlxaHVUcVdoTjJsTUlCZTgybm1XZU9CSVlLVUdKaHVxd3VMQjNwSXBITWFFMy1PR1VTQldTQ3N5ZU10aXg4VUpqaG5MSS1ZelhpOTNmQnFxVk9SQkl1ZF9UeHRCS3ZISkQ4dEdvemNlb0JhVGw0MTdUOFpKLXlQejQ2azEyeWctQktNZFZ0RnZnTl90clNyMk0wVE5OZkZOVGlXNHlpQzRKa1k1Um93UjVYSEFqbFZsQlNSYnc4MXJxUDlMbmdvZGd0bWhaaFJDc2xyWVFNbkxwQktCYmtMUDNYX1NTT0F5a3d4TUxHMnRrZGUybjRRWFpqVVRlNHhTX0FRMzgwUHFuLWZTb1U1NDFRSVZV"
                            }
                        };
                        task.contained[0] = Object.assign(task.contained[0], signature);
                    }
                });
            } else {
                task.output = [];
        
                payload.forEach((e) => {
                    task.output.push ({
                        "type": {
                            "coding": [{
                                "system": "http://hl7.org/fhir/us/davinci-hrex/CodeSystem/hrex-temp",
                                "code": "data-value"
                            }]
                        },
                        "valueReference": {
                            "reference": CDEX.providerEndpoint.url + "/" + e.resourceType + "/" + e.id
                        }
                    });
                });
            }            
        }

        task.lastModified = timestamp;
        CDEX.operationTaskPayload = task;
    };

    CDEX.skipLoadData = false;
    CDEX.subscriptions = [];

    CDEX.getSubscription = (task) => {
        const taskID = task.id;
        return CDEX.subscriptions.find((s) => {
            const ch = s.channel;
            return s.criteria.startsWith('Task') && s.criteria.endsWith(taskID) && ch.type === "rest-hook" && ch.endpoint && ch.payload;
        });
    };

    CDEX.notify = (task) => {
        const subscription = CDEX.getSubscription(task);
        if (subscription) {
            let config = {
                type: 'PUT',
                url: subscription.channel.endpoint + "/Task/" + task.id,
                data: JSON.stringify(task),
                contentType: "application/fhir+json"
            };
            $.ajax(config);
        }
    };

    CDEX.loadData = (client, firstRun = true) => {
        try {
            CDEX.client = client;
            Promise.all([CDEX.client.api.fetchAll(
                {type: "Task"}
            ),CDEX.client.api.fetchAll(
                {type: "Subscription"}
            )])
            .then(async function(res) {
                let tasks = res[0];
                let subscriptions = res[1];
                CDEX.tasks = tasks;
                CDEX.subscriptions = subscriptions;
                if (firstRun) $('#communication-request-selection-list').empty();
                let out = "";
                let buttons = [];

                if(tasks.length) {
                    let index = 0;
                    for (const task of CDEX.tasks.sort((a,b) => -1*(('' + a.authoredOn).localeCompare(b.authoredOn)))) {

                        // add profile if needed
                        const profile = "http://hl7.org/fhir/us/davinci-hrex/StructureDefinition/hrex-task-data-request";
                        if (!task.meta) task.meta = {};
                        if (!task.meta.profile) task.meta.profile = [];
                        if (!task.meta.profile.includes(profile)) {
                            task.meta.profile.push (profile);
                        }

                        //validate task
                        let conf = {
                            type: 'POST',
                            url: CDEX.providerEndpoint.url + "/" + task.resourceType + "/$validate?profile=http://hl7.org/fhir/us/davinci-hrex/StructureDefinition/hrex-task-data-request",
                            data: JSON.stringify(task),
                            contentType: "application/fhir+json",
                            accept: "application/fhir+json"
                        };

                        let validate = null;
                        try {
                            validate = await $.ajax(conf);
                        } catch(err) {
                            validate = err.responseJSON;
                        }

                        let error = validate.issue.find((e) => e.severity === "error");
                        if (error) error = validate;

                        const idName = "btnCommReq" + index;
                        const idButton = "COMM-" + idName;
                        const idButtonErr = "ERR-" + idName;
                        const subscription = CDEX.getSubscription(task);

                        out +=
                            "<tr><td class='medtd'><a href='" + CDEX.providerEndpoint.url + "/" + task.resourceType + "/" + task.id +
                            "' target='_blank'>" + task.id + "</a></td><td class='medtd'>" +
                            CDEX.formatDate(task.authoredOn) +
                            "</td><td class='medtd'>" + (!error?"<span class='positive'>Yes</span>":"<a href='#' id='" + idButtonErr + "' class='negative'>No</a>") + "</td><td class='medtd'>" + (subscription?"Yes":"No") + "</td><td class='medtd' id='" + idName + "'></td></tr>";

                        if (error) {
                            $('#' + idButtonErr).click(() => {
                                alert(JSON.stringify(error.issue, null, "  "));
                                return false;
                            });
                        }

                        if (task.status === "in-progress") {
                            buttons.push({
                                idName: idName,
                                idButton: idButton,
                                append: "<div><a href='#' id='" + idButton + "'> fulfill </a></div>",
                                click: () => {
                                    CDEX.openCommunicationRequest(task.id);
                                    return false;
                                }
                            });
                        } else if (task.status === "requested") {
                            buttons.push({
                                idName: idName,
                                idButton: idButton,
                                append: "<div><a href='#' id='" + idButton + "'> acknowledge </a></div>",
                                click: () => {
                                    task.status = "in-progress";
                                    task.businessStatus = {"text": "Results will be reviewed for release"};
    
                                    let config = {
                                        type: 'PUT',
                                        url: CDEX.providerEndpoint.url + CDEX.submitTaskEndpoint + task.id,
                                        data: JSON.stringify(task),
                                        contentType: "application/fhir+json"
                                    };
                                    $.ajax(config);
                                    CDEX.notify(task);
    
                                    $('#' + idButton).html(" fulfill ");
                                    $('#' + idButton + "2").remove();
                                    $('#' + idButton + "3").remove();
                                    $('#' + idButton).click(() => {
                                        CDEX.openCommunicationRequest(task.id);
                                        return false;
                                    });
                                    CDEX.skipLoadData = true;
                                    return false;
                                }
                            });                            
                            buttons.push({
                                idName: idName,
                                idButton: idButton + '2',
                                append: "<div><a href='#' id='" + idButton + "2'> reject </a></div>",
                                click: () => {
                                    task.status = "rejected";
                                    task.businessStatus = {"text": "Unable to verify claim"};
                                    task.statusReason = {"text": "Unable to verify claim"};
    
                                    let config = {
                                        type: 'PUT',
                                        url: CDEX.providerEndpoint.url + CDEX.submitTaskEndpoint + task.id,
                                        data: JSON.stringify(task),
                                        contentType: "application/fhir+json"
                                    };
                                    $.ajax(config);
                                    CDEX.notify(task);
    
                                    $('#' + idButton).remove();
                                    $('#' + idButton + "2").remove();
                                    $('#' + idButton + "3").remove();
                                    CDEX.skipLoadData = true;
                                    return false;
                                }
                            });
                            buttons.push({
                                idName: idName,
                                idButton: idButton + '3',
                                append: "<div><a href='#' id='" + idButton + "3'> failure </a></div>",
                                click: () => {
                                    task.status = "failed";
                                    task.businessStatus = {"text": "Unable to process request"};
                                    task.statusReason = {"text": "Unable to process request"};
    
                                    let config = {
                                        type: 'PUT',
                                        url: CDEX.providerEndpoint.url + CDEX.submitTaskEndpoint + task.id,
                                        data: JSON.stringify(task),
                                        contentType: "application/fhir+json"
                                    };
                                    $.ajax(config);
                                    CDEX.notify(task);
    
                                    $('#' + idButton).remove();
                                    $('#' + idButton + "2").remove();
                                    $('#' + idButton + "3").remove();
                                    CDEX.skipLoadData = true;
                                    return false;
                                }
                            });
                        }
                        index++;
                    }
                }
                if (!CDEX.skipLoadData || firstRun) {
                    $('#communication-request-selection-list').html(out);
                    buttons.forEach((b) => {
                        $('#' + b.idName).append(b.append);
                        $('#' + b.idButton).click(b.click);
                    });
                    $('#spinner').hide();
                    $('#communication-request-list').show();
                } else {
                    CDEX.skipLoadData = false;
                }
                CDEX.timout = setTimeout(() => CDEX.loadData(CDEX.client, false), 3000);
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
        $('#btn-submit').html("<i class='fa fa-circle-o-notch fa-spin'></i> Release Data");

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
            $('#scenario-intro').html(CDEX.scenarioDescription.description);
            CDEX.displayIntroScreen();
            CDEX.loadData(client);
        }
    };

    CDEX.finalize = () => {
        let promise;
        let config = {
            type: 'PUT',
            url: CDEX.providerEndpoint.url + CDEX.submitTaskEndpoint + CDEX.operationTaskPayload.id,
            data: JSON.stringify(CDEX.operationTaskPayload),
            contentType: "application/fhir+json"
        };

        promise = $.ajax(config);
        CDEX.notify(CDEX.operationTaskPayload);
        console.log(JSON.stringify(CDEX.operationTaskPayload, null, 2));
        promise.then(() => {
            $("#submit-endpoint").html("PUT " + CDEX.providerEndpoint.url + CDEX.submitTaskEndpoint + CDEX.operationTaskPayload.id);
            $("#text-output").html(JSON.stringify(CDEX.operationTaskPayload, null, '  '));
            const subscription = CDEX.getSubscription(CDEX.operationTaskPayload);
            if (subscription) {
                $("#subscription-endpoint").show();
                $("#subscription-endpoint").html("Subscription notified at " + subscription.channel.endpoint);
            } else {
                $("#subscription-endpoint").hide();
            }
            CDEX.displayConfirmScreen();
        }, () => CDEX.displayErrorScreen("Communication submission failed",
            "Please check the submit endpoint configuration.  You can close this window now."));
    };

    CDEX.restart = () => {
        clearTimeout(CDEX.timout);
        CDEX.skipLoadData = true;
        $('#discharge-selection').show();
        CDEX.enable('btn-submit');
        CDEX.enable('btn-edit');
        $('#btn-submit').html("Release Data");
        $('#spinner').show();
        $('#communication-request-list').hide();
        CDEX.loadData(CDEX.client);
        CDEX.displayCommunicationRequestScreen();
    }

    $('#btn-start').click(function (){
        CDEX.displayCommunicationRequestScreen();
    });

    $('#btn-restart').click(CDEX.restart);

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

    $('#chk-method').bootstrapToggle({
        on: 'Yes',
        off: 'No'
    });

    FHIR.oauth2.ready(CDEX.initialize);

}());
