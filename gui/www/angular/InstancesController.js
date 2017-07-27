app.controller('InstancesController', ['$scope', '$rootScope', '$window', '$http', 'sharedService', 'sharedTree', 'currentRow',
    function($scope, $rootScope, $window, $http, sharedService, sharedTree, currentRow) {


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // CONSTANTS AND GLOBAL VARIABLES
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Time intervals for update functions, expressend in milliseconds
        const INTERVAL_UPDATE_SOLVING_INFO = 1000;
        const INTERVAL_UPDATE_INSTANCES    = 5000;
        const INTERVAL_UPDATE_EVENTS       = 5000;


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // MAIN
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Start application
        $scope.load = function() {
            $http({method: 'GET', url: '/info'}).then(
                function(res) {
                    let info = res.data;
                    $scope.isRealTime = info.isRealTime;
                    document.getElementById('smts-title-version').innerHTML = `v${info.version}`;

                    if (info.isRealTime) {
                        // Show server container
                        $('#smts-server-container').removeClass('smts-hidden');

                        // Request updates if real time analysis
                        $scope.updateSolvingInfoIntervalId =
                            window.setInterval($scope.updateSolvingInfo, INTERVAL_UPDATE_SOLVING_INFO);
                        $scope.updateInstancesIntervalId =
                            window.setInterval($scope.updateInstances, INTERVAL_UPDATE_INSTANCES);
                    }
                    else {
                        // Show database container
                        $('#smts-database-container').removeClass('smts-hidden');
                    }

                    // Get instances
                    $scope.getInstances();
                }, $scope.error);
        };

        // Get all instances and load them in instances table
        $scope.getInstances = function() {
            $http({method: 'GET', url: '/instances'}).then(
                function(res) {
                    $scope.instances = res.data;
                }, $scope.error);
        };


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // INSTANCE
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Select an instance and load its data from database
        // @param {Instance} instance: Selected instance.
        $scope.selectInstance = function(instance) {
            // Highlight instance
            smts.tables.instances.highlight([instance]);

            // First time an instance is selected
            document.getElementById('smts-content').classList.remove('smts-hidden');

            // Get tree data
            this.getEvents(instance);

            // If real-time analysis, ask every 5 seconds for db content
            if ($scope.isRealTime) {
                clearInterval($scope.updateEventsIntervalId); // Clear previous instance updates
                $scope.updateEventsIntervalId =
                    setInterval($scope.updateEvents.bind(null, instance), INTERVAL_UPDATE_EVENTS);
            }

            // Get instance CNF if available
            this.getSMT(instance);
        };

        $scope.getSMT = function(instance) {
            $http({method: 'GET', url: `/cnf/${instance.name}`}).then(
              function(res) {
                  if (res.data) {
                      let smt = new SMT.DAG(JSON.parse(res.data));
                      smts.SMT.update(smt);
                  }
              }, $scope.error);
        };

        // Load database data relative to a particular instance
        // It gets the database data and generates a tree with it.
        // @param {Instance} instance: Instance to load data from.
        // @param (Number) [optional] id: If present, requests events only from
        // given id, and appends them to already existing events. Otherwise,
        // events are completly overwritten.
        $scope.getEvents = function(instance, eventId) {
            let query = eventId ? `?id=${eventId}` : ``;
            $http({method: 'GET', url: `/events/${instance.name}${query}`}).then(
                function(res) {
                    let events = res.data || [];

                    if (!eventId) $scope.events = []; // Reset events if new request

                    // Return if we receive an empty update from the current instance
                    let instanceName = smts.tables.instances.getSelected();
                    if (instance.name === instanceName && !events.length) {
                        return;
                    }
                    $scope.events = $scope.events.concat(events);

                    // Update last event
                    let lastEvent = $scope.events[$scope.events.length - 1];
                    if (lastEvent) $scope.lastEventId = lastEvent.id;

                    // Initialize tree
                    sharedTree.tree = new TreeManager.Tree();
                    sharedTree.tree.createEvents($scope.events);
                    sharedTree.tree.initializeSolvers($scope.events);
                    currentRow.value = $scope.events.length - 1;

                    // Initialize timeline
                    smts.timeline.clear();
                    smts.timeline.make(sharedTree.tree.getEvents(currentRow.value + 1));

                    // Notify an instance has been selected
                    sharedService.broadcastSelectInstance();
                }, $scope.error);
        };


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // UPDATES
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Get current solving instance info to show in server container
        $scope.updateSolvingInfo = function() {
            $http({method: 'GET', url: '/getSolvingInfo'}).then(
                function(res) {
                    let instanceData = res.data;
                    // Bold running instance
                    smts.tables.instances.bold([instanceData]);
                    // Broadcast running instance data
                    sharedService.broadcastUpdateInstanceData(instanceData);
                }, $scope.error);
        };

        // Get instances and add new ones to instances table
        $scope.updateInstances = function() {
            $http({method: 'GET', url: '/instances'}).then(
                function(res) {
                    let newInstances = res.data;
                    for (let newInstance of newInstances) {
                        // Check if newInstance doesn't match any of those already present in table
                        if ($scope.instances.every(instance => instance.name !== newInstance.name)) {
                            $scope.instances.push(newInstance);
                        }
                    }
                }, $scope.error);
        };

        // Get events starting from the first id not present in events table
        // @param {Instance} instance: Instance to which the events are
        // associated.
        $scope.updateEvents = function(instance) {
            $scope.getEvents(instance, $scope.lastEventId + 1);
        };


        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // OTHER
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Handle errors for HTTP requests
        // @param {Error} err: The error received.
        $scope.error = function(err) {
            $scope.clearAllIntervals();
            smts.tools.error(err);
        };

        // Clear all intervals
        // In case of error, all real time requests to database are suppressed
        $scope.clearAllIntervals = function() {
            if ($scope.updateSolvingInfoIntervalId) {
                clearInterval($scope.updateSolvingInfoIntervalId);
                $scope.updateSolvingInfoIntervalId = null;
            }
            if ($scope.updateInstancesIntervalId) {
                clearInterval($scope.updateInstancesIntervalId);
                $scope.updateInstancesIntervalId = null;
            }
            if ($scope.updateEventsIntervalId) {
                clearInterval($scope.updateEventsIntervalId);
                $scope.updateEventsIntervalId = null;
            }
        }
    }]);
