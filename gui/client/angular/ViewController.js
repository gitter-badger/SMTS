app.controller('ViewController', ['$scope', '$rootScope', 'currentRow', 'sharedTree', '$window', '$http', 'sharedService',
    function ($scope, $rootScope, currentRow, sharedTree, $window, $http, sharedService) {
        $scope.$on('handleBroadcast', function () { // This is called when an instance is selected
            sharedTree.tree.arrangeTree(currentRow.value);
            let root = sharedTree.tree.getRoot();
            generateDomTree(root, sharedTree.tree.getSelectedNodeNames(currentRow.value));
        });

        $(window).resize(function() {
            sharedTree.tree.arrangeTree(currentRow.value);
            let root = sharedTree.tree.getRoot();
            let position = $('g')[0].getAttribute("transform");
            generateDomTree(root, sharedTree.tree.getSelectedNodeNames(currentRow.value), position);
        });
    }]);