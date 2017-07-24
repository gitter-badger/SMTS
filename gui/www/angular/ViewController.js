app.controller('ViewController', ['$scope', '$rootScope', '$window', '$http', 'sharedService', 'sharedTree', 'currentRow',
    function($scope, $rootScope, $window, $http, sharedService, sharedTree, currentRow) {

        // Regenerate tree on window resize
        $(window).resize(function() {
            if (sharedTree.tree) {
                sharedTree.tree.arrangeTree(currentRow.value);
                smts.tree.make(sharedTree.tree, smts.tree.getPosition());
            }
        });
    }]);