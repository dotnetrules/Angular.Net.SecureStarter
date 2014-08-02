﻿(function () {
    'use strict';

    var serviceId = 'externalAuthSvc';

    angular.module('app.security')
        .factory(serviceId, ['$location', '$q', 'storageSvc', 'appActivitySvc', 'notifierSvc','userSvc', externalAuthSvc]);

    function externalAuthSvc($location, $q, storageSvc, appActivitySvc, notifierSvc, userSvc) {
        var registrationInfo, associationInfo;

        var service = {
            handleAuthResponse: handleAuthResponse,
            getRegistrationInfo: getRegistrationInfo,
            getAssociationInfo: getAssociationInfo
        };

        return service;

        function handleAuthResponse() {
            appActivitySvc.busy("externalAuthSvc");

            var locationPath = $location.path(), redirectPath = "/", deferred = $q.defer();

            if (locationPath.indexOf("/externalauth") === 0) {
               
                var externalActionResult = parseResponse($location.hash());

                cleanUp();

                if (!externalActionResult || !externalActionResult.access_token) {
                    notifierSvc.show({ message: "something went wrong. Error: rereiving access token", type: "error" });
                    appActivitySvc.idle("externalAuthSvc");                    
                    $location.path("/signIn");
                    deferred.resolve(true);

                } else if (externalActionResult.error) {
                    notifierSvc.show({ message: "something went wrong. Error: " + externalActionResult.error, type: "error" });
                    appActivitySvc.idle("externalAuthSvc");
                    $location.path("/signIn");
                    deferred.resolve(true);
                } else {

                    if (locationPath === "/externalauth/signin") {
                        storageSvc.store("accessToken", externalActionResult.access_token, true);
                    } else if (locationPath === "/externalauth/register") {
                        storageSvc.store("accessToken", externalActionResult.access_token, true);
                        registrationInfo = externalActionResult;
                    } else if (locationPath === "/externalauth/association") {
                        associationInfo = { externalAccessToken: externalActionResult.access_token };
                        redirectPath = "/manage";
                    }

                    userSvc.getUserInfo().then(
				        function (result) {
				            if (result.hasRegistered) {
				                userSvc.setUser(result);

				                if (associationInfo) {
				                    associateLogin();
				                } else {
				                    appActivitySvc.idle("externalAuthSvc");
				                    $location.path(redirectPath);
				                }
				            } else {
				                registrationInfo = {
				                    email: result.email,
				                    loginProvider: result.loginProvider,
				                    username: result.userName
				                };

				                appActivitySvc.idle("externalAuthSvc");
				                $location.path("/externalRegister");
				            }

				            deferred.resolve(true);
				        },
				        function (result) {
				            //error	
				            notifierSvc.show({ message: "something went wrong", type: "error" });
				            appActivitySvc.idle("externalAuthSvc");
				            $location.path("/signIn");

				            deferred.reject(true);
				        });
                }
            } else {
                deferred.reject(false);
            }

            return deferred.promise;
        }

        function associateLogin() {
            userSvc.addExternalLogin(associationInfo).then(
				function (result) {
				    //success
				    notifierSvc.show({ message: "login added successfully", type: "info" });
				    always();
				},
				function (result) {
				    //error
				    notifierSvc.show({ message: "something went wrong associating login", type: "error" });
				    always();
				});

            function always() {
                appActivitySvc.idle("externalAuthSvc");
                $location.path("/manage");
            }
        }

        function cleanUp() {
            $location.hash("");
            storageSvc.remove("registrationInfo");            
        }

        function getRegistrationInfo() {  
            return registrationInfo;
        }

        function getAssociationInfo() {
            return associationInfo;
        }

        function parseResponse(response){            
            var result = {};

            var urlParts = response.split("&");                       

            urlParts.forEach(function (item) {
                var splitItem = item.split("=");
                result[splitItem[0]] = decodeURIComponent(splitItem[1]);
            });
            
            return result;
        }
    }
})();