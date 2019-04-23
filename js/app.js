var CDEX;
if (!CDEX) {
    CDEX = {};
}

(function () {

    CDEX.client = null;
    CDEX.communicationRequests = null;
    CDEX.communicationRequest = null;

    CDEX.displayPatient = (pt, screen) => {
        $('#' + screen).html(CDEX.getPatientName(pt));
    };

    CDEX.displayScreen = (screenID) => {
        $('#data-request-screen').hide();
        $('#review-screen').hide();
        $('#confirm-screen').hide();
        $('#config-screen').hide();
        $('#communication-request-screen').hide();
        $('#'+screenID).show();
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

    CDEX.displayConfigScreen = () => {
        if (CDEX.configSetting === "custom") {
            $('#config-select').val("custom");
        } else {
            $('#config-select').val(CDEX.configSetting);
        }
        $('#config-text').val(JSON.stringify(CDEX.providerEndpoint, null, 2));
        CDEX.displayScreen('config-screen');
    };

    CDEX.displayReviewScreen = () => {
        $("#final-list").empty();
        let checkboxes = $('#selection-list input[type=checkbox]');
        let checkedRequests = [];
        for (let i = 0; i < checkboxes.length; i++) {
            if(checkboxes[i].checked == true){
                checkedRequests.push(checkboxes[i].id);
            }
        }

        var queries = CDEX.communicationRequest.payload[0].contentString.split(" ;");
        for(let i = 0; i < queries.length; i++){
            if(checkedRequests.includes(queries[i])) {
                $('#final-list').append(
                    "<tr> <td class='medtd'>" + queries[i] + "</td></tr>");
            }
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

                if (communicationRequest.payload[0].contentString) {
                    let queries = communicationRequest.payload[0].contentString.split(" ;");
                    queries.forEach(function (FHIRQuery) {
                        if(FHIRQuery !== "") {
                            let queryParams = FHIRQuery.split("?");
                            $('#selection-list').append(
                                "<tr class='alert-warning'> <td class='medtd'>" +FHIRQuery  +
                                "</td><td> <input type=\"checkbox\" id=" + FHIRQuery + " checked=\"checked\"></td></tr>");
                            CDEX.client.api.fetchAll(
                                {
                                    type: queryParams[0],
                                    query: queryParams[1]

                                }
                            ).then(function (results) {
                                results.forEach(function (result){
                                    var text = "";
                                    if(result.text){
                                        text = result.text;
                                    }
                                    $('#selection-list').append(
                                            "<tr> <td class='medtd'>" + result.id + "</td><td>" +
                                        text + "</td></tr>");
                                });
                            });
                        }
                    });
                }
            }
        });
    }

    CDEX.loadData = (client) => {
        try {
            CDEX.client = client;
            CDEX.displayCommunicationRequestScreen();

            CDEX.client.api.fetchAll(
                {type: "CommunicationRequest"}
            ).then(function(communicationRequests) {
                CDEX.communicationRequests = communicationRequests;
                if(communicationRequests.length) {
                    CDEX.communicationRequests.forEach(function(commReq, index){
                        let idName = "btnCommReq" + index;
                        let description = "";
                        if(commReq.text){
                            if(commReq.text.div){
                                description = commReq.text.div;
                            }
                        }

                        $('#communication-request-selection-list').append(
                            "<tr><td class='medtd'>" + commReq.id + "</td><td class='medtd'>" + description +
                            "</td><td class='medtd'>" + commReq.authoredOn +
                            "</td><td class='medtd'><button type='button' class='btn btn-secondary' id='" + idName +
                            "' >Select</button></td></tr>");

                        $('#' + idName).click(() => {CDEX.openCommunicationRequest(commReq.id)});
                    });
                }
            });
        } catch (err) {
            CDEX.displayErrorScreen("Failed to initialize communication requests menu", "Please make sure that everything is OK with request configuration");
        }
    };


    CDEX.initialize = (client) => {
        CDEX.loadConfig();
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

    CDEX.loadConfig = () => {
        let configText = window.localStorage.getItem("cdex-commres-app-config");
        if (configText) {
            let conf = JSON.parse (configText);
            if (conf['custom']) {
                CDEX.providerEndpoint = conf['custom'];
                CDEX.configSetting = "custom";
            } else {
                CDEX.providerEndpoint = CDEX.providerEndpoints[conf['selection']];
                CDEX.configSetting = conf['selection'];
            }
        }
    }

    CDEX.finalize = () => {
        let promise;

        var config = {
            type: 'POST',
            url: CDEX.providerEndpoint.url + CDEX.submitEndpoint,
            data: JSON.stringify(CDEX.operationPayload),
            contentType: "application/fhir+json"
        };

        if (CDEX.providerEndpoint.type !== "open") {
            config['beforeSend'] = function (xhr) {
                xhr.setRequestHeader ("Authorization", "Bearer " + CDEX.providerEndpoint.accessToken);
            };
        }

        promise = $.ajax(config);

        promise.then(() => {
            console.log (JSON.stringify(CDEX.operationPayload, null, 2));
            CDEX.displayConfirmScreen();
        }, () => CDEX.displayErrorScreen("Communication request submission failed", "Please check the submit endpoint configuration"));
    }


    $('#btn-review').click(CDEX.displayReviewScreen);
    $('#btn-start').click(CDEX.displayDataRequestScreen);
    $('#btn-edit').click(CDEX.displayDataRequestScreen);
    // $('#btn-submit').click(CDEX.reconcile);

    CDEX.providerEndpoints.forEach((e, id) => {
        $('#config-select').append("<option value='" + id + "'>" + e.name + "</option>");
    });
    $('#config-select').append("<option value='custom'>Custom</option>");
    $('#config-text').val(JSON.stringify(CDEX.providerEndpoints[0],null,"   "));

    $('#config-select').on('change', function() {
        if (this.value !== "custom") {
            $('#config-text').val(JSON.stringify(CDEX.providerEndpoints[parseInt(this.value)],null,2));
        }
    });

    $('#config-text').bind('input propertychange', () => {
        $('#config-select').val('custom');
    });

    FHIR.oauth2.ready(CDEX.initialize);

}());
