smts.cnf = {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MEMBER VARIABLES
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Clauses CNF wrapper. `instanceName` and `nodePath` are used as id to
    // identify which node is currently selected for clauses. `data` contains
    // nodes and edges to be rendered in the vis.js network.
    // Type: {instanceName: string, nodePath: string, data: object}[]
    clauses: null,

    // Learnts CNF wrapper. `instanceName` and `solverAddress` are used as id
    // to identify which solver is currently selected for learnts. `data`
    // contains nodes and edges to be rendered in the vis.js network.
    // Type: {instanceName: string, solverAddress: string, data: object}[]
    learnts: null,

    // Dictionary which maps node ids to a counter. The counter keeps track of
    // how many times a node is added or removed to/from the network. When the
    // node is added, if the counter is 0, the node is actually added to the
    // network, otherwise the counter is incremented. Similarly, when the node
    // gets removed the counter is decremented, if it reaches 0, the node is
    // actually removed from the network. This is needed to avoid adding
    // multiple times nodes representing the same literal.
    // Type: {id: number}
    nodesCounts: null,

    // Dictionary which maps edge ids to a counter. The counter keeps track of
    // how many times an edge is added or removed to/from the network. When the
    // edge is added, if the counter is 0, the edge is actually added to the
    // network, otherwise the counter is incremented. Similarly, when the edge
    // gets removed the counter is decremented, if it reaches 0, the edge is
    // actually removed from the network. This is needed to avoid adding
    // multiple times edges representing the same connection between literals.
    edgesCounts: null,

    // Dictionary mapping literal ids (same as their corresponding node ids) to
    // the literal object, where a literal object has the following structure:
    //   literal = {
    //       id:        number,   // E.g.: 1341100027
    //       name:      any[],    // E.g.: [ 'op' [ 'op' [ 'not', 'e2' ], 'e1' ], [ 'and', 'e0', 'e1' ] ]
    //       variables: string[], // E.g.: [ 'e0', 'e1', 'e2' ]
    //       clauseIds: number[]  // E.g.: [ 12, 365 ]
    //   }
    // N.B.: Each array in the literal's name represents a function, where the
    // first element is the function name, and the others are parameters. The
    // parameters can be other functions (arrays) or variables (strings).
    // Type: {id: object}
    literals: {},

    // Network generated by the vis.js library.
    // Type: vis.Network
    network:  null,

    // vis.js network datasets, used to manipulate the network without loading
    // it from scratch each time.
    // Type: vis.DataSet
    nodes: null,
    edges: null,

    // Color styles for nodes and edges used by vis.js
    color: {
        node: {
            normal: {
                border: '#2b7ce9',
                background: '#d2e5ff',
                highlight: {
                    border:     '#831717',
                    background: '#ff4c4c'
                }
            },
            unary: {
                border: '#ff00e4',
                background: '#cbafcd',
                highlight: {
                    border:     '#831717',
                    background: '#ff4c4c'
                }
            },
        },
        edge: {
            normal: {
                // Default settings
            },
            learnt: {
                color: '#00640a'
            },
        }
    },

    // Options used by the vis.js network.
    // Type: object
    options: {
        interaction: {
            dragNodes:       true,
            hideEdgesOnDrag: true
        },
        nodes: {
            shape: 'circle',
            color: {
                border: '#2b7ce9',
                background: '#d2e5ff',
                highlight: {
                    border:     '#831717',
                    background: '#ff4c4c'
                }
            }
        },
        edges: {
            smooth: false
        },
        layout: {
            improvedLayout: false
        },
        physics: {
            enabled:       true,
            stabilization: {enabled: true, iterations: 1000}
        }
    },

    // Interval id to keep track of the loading animation.
    // Type: number
    loadAnimationInterval: null,


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // LITERAL INFO
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Parse a literal name and extract its variables
    // @param {object} literalName: The name of the literal to be parsed.
    // @return {string[]}: The list of variables appearing in the literal.
    getVariables: function(literalName) {
        let variables = [];
        makeVariablesRec(literalName, variables);
        return variables;

        function makeVariablesRec(literalName, variables) {
            if (typeof literalName === 'string') {
                if (!variables.includes(literalName)) {
                    variables.push(literalName);
                }
            } else {
                for (let i = 1; i < literalName.length; ++i) {
                    makeVariablesRec(literalName[i], variables);
                }
            }
        }
    },

    // Get list of IDs of literals that have to be selected.
    // The selection is made based on the variable and clause switches, and on
    // the active clauses and variables (clauses and variables for which the
    // corresponding button is active in the literal info panel).
    // If the clause switch is on 'OR', the clause condition is satisfied if at
    // least one of the active clauses is present in the literal (N.B.: if no
    // clause is active, then the condition is not satisfied). If the clause
    // switch is on 'AND', the clause condition is true if all the active
    // clauses are present in the literal. The same holds for the variable
    // condition.
    // If both the the clause and variable conditions are satisfied for a
    // particular literal, then its corresponding node is selected.
    // @param {string[]} variables: List of variables to be compared with each
    // literal.
    // @param {number[]} clauses: List of clause ids to be compared with each
    // literal.
    // @return {number[]}: List of IDs of literals to be selected.
    getSelectedLiteralIds: function(variables, clauseIds) {
        // An active switch represents an 'or', otherwise an 'and'
        let orVariables = $('#smts-content-cnf-literal-info-variables-switch').bootstrapSwitch('state');
        let orClauses   = $('#smts-content-cnf-literal-info-clauses-switch').bootstrapSwitch('state');

        // If the switch is on 'or', then use `some`, otherwise use `every`
        let testVariables = orVariables ? Array.prototype.some : Array.prototype.every;
        let testClauses   = orClauses   ? Array.prototype.some : Array.prototype.every;

        testVariables = testVariables.bind(variables);
        testClauses   = testClauses.bind(clauseIds);

        let selectedLiteralIds = [];
        for (let literalId in this.literals) {
            let literal = this.literals[literalId];
            if (testClauses(includes.bind(literal.clauseIds)) &&   // Some/every clauseId is in literal.clauseIds
                testVariables(includes.bind(literal.variables))) { // Some/every variable is in literal.variables
                selectedLiteralIds.push(literal.id);
            }
        }

        return selectedLiteralIds;

        // Custom `includes` function
        // The method `Array.prototype.includes` doesn't work well with
        // `Array.prototype.some` and `Array.prototype.every`.
        function includes(target) {
            for (let element of this) if (target === element) return true;
            return false;
        }
    },


    // Update and display the selected nodes
    // The selection is done based on the literal info panel selections (see
    // `getSelectedLiteralIds` for more details).
    // N.B.: Since this function is called from a click event listener, `this`
    // is bound to the DOM element, not to the `smts.cnf` object.
    updateSelectedNodes: function() {
        // Toggle clicked button active state
        this.classList.toggle('active');

        // Get list of active variable buttons
        let variables = [];
        let variableBtns = document.getElementById('smts-content-cnf-literal-info-variables');
        for (let variableBtn of variableBtns.childNodes) {
            if (variableBtn.classList.contains('active')) {
                variables.push(variableBtn.getAttribute('data-variable'));
            }
        }

        // Get list of active clause buttons
        let clauses = [];
        let clausesBtns = document.getElementById('smts-content-cnf-literal-info-clauses');
        for (let clauseBtn of clausesBtns.childNodes) {
            if (clauseBtn.classList.contains('active')) {
                clauses.push(parseInt(clauseBtn.getAttribute('data-clause')));
            }
        }

        // Get literals that match the active variables and clauses
        let selectedLiteralIds = smts.cnf.getSelectedLiteralIds(variables, clauses);

        // Add current literal to selected list (current should always be selected)
        let literalInfo = document.getElementById('smts-content-cnf-literal-info');
        let literalId = literalInfo.getAttribute('data-literal-id');
        if (!selectedLiteralIds.includes(literalId)) {
            selectedLiteralIds.push(literalId);
        }

        // Select nodes
        if (smts.cnf.network) {
            smts.cnf.network.selectNodes(selectedLiteralIds, false);
        }
    },

    // Populate the literal info panel with literal information
    // @param {number} literalId: id of the literal to load in the info panel.
    // If no id is provided, then the panel gets hidden.
    generateLiteralInfo: function(literalId) {
        let literalInfo = document.getElementById('smts-content-cnf-literal-info');

        if (!literalId) {
            literalInfo.classList.add('smts-hidden');
        } else {
            let literal = this.literals[literalId];
            literalInfo.setAttribute('data-literal-id', literalId);

            // Clear previous info
            let variableBtns = document.getElementById('smts-content-cnf-literal-info-variables');
            let clauseBtns   = document.getElementById('smts-content-cnf-literal-info-clauses');
            variableBtns.innerHTML = '';
            clauseBtns.innerHTML   = '';

            // Make variables buttons
            for (let variable of literal.variables) {
                let variableBtn = document.createElement('div');
                variableBtn.classList = 'btn btn-default btn-xs';
                variableBtn.setAttribute('data-variable', variable);
                variableBtn.innerHTML = variable;
                variableBtn.addEventListener('click', this.updateSelectedNodes);
                variableBtns.appendChild(variableBtn);
            }

            // Make clauses buttons
            for (let clauseId of literal.clauseIds) {
                let clauseBtn = document.createElement('div');
                clauseBtn.classList = 'btn btn-default btn-xs';
                clauseBtn.setAttribute('data-clause', clauseId);
                clauseBtn.innerHTML = clauseId;
                clauseBtn.addEventListener('click', this.updateSelectedNodes);
                clauseBtns.appendChild(clauseBtn);
            }

            let formula = document.getElementById('smts-content-cnf-literal-info-formula');
            formula.innerHTML = literal.name;

            // Show info
            literalInfo.classList.remove('smts-hidden');
        }
    },


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // NETWORK
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Make id for a node
    // The id of a node is an hash (number) of the stringified literal name.
    // @param {any[]} literalName: The name of the literal.
    // @return {number}: The hash id of the literal.
    makeNodeId: function(literalName) {
        let str = JSON.stringify(literalName);

        // String hash function found at
        // http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            let char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return hash;
    },

    // Make id for an edge
    // It takes two nodes and forms an id with the form:
    //   - 'id1-id2' if id1 < id2
    //   - 'id2-id1' otherwise
    // @param {number} id1: The first node id.
    // @param {number} id2: The second node id.
    // @return {string}: The id of the edge.
    makeEdgeId: function(id1, id2) {
        return id1 < id2 ? `${id1.toString()}-${id2.toString()}` : `${id2.toString()}-${id1.toString()}`;
    },

    // Get the data structure containing nodes and edges of a given CNF
    // @param {string} cnfStr: String representing a CNF, in JSON compatible
    // format.
    // @param {boolean} addLiterals: If true, the literal is also added to
    // `this.literals`. Usually, true for caluses and false for learnts.
    // @return {object}: Object of the form {nodes: object[], edges: object[]},
    // where nodes and edges are list containing nodes and edges to be rendered
    // in the vis.js network.
    getData: function(cnfStr, addLiterals, addUnary) {
        // Remove variables starting with `.` (e.g.: `.frame1`), since they are
        // not relevant for the representation.
        let cnf = JSON.parse(cnfStr.replace(/,?\s*"\.\w+"/g, ''))[0];

        let nodes = [];
        let edges = [];

        for (let i = 1; i < cnf.length; ++i) { // cnf[0] == 'and'
            let clause = cnf[i];

            // Unary clauses are not preceeded by 'or'
            if (clause[0] !== 'or') {
                clause = [ 'or', clause ];
            }

            // Literals
            for (let j = 1; j < clause.length; ++j) {  // clause[0] == 'or'
                let literalName = clause[j];

                // Make node
                let nodeId = this.makeNodeId(literalName);
                nodes.push({
                    id: nodeId,
                    isUnary: addUnary && clause.length === 2
                });

                // Make edges from all previous nodes in same clause to current
                for (let k = 1; k < j; ++k) {
                    let sourceId = this.makeNodeId(clause[k]);
                    let edgeId   = this.makeEdgeId(nodeId, sourceId);
                    edges.push({
                        id:   edgeId,
                        from: sourceId,
                        to:   nodeId
                    });
                }

                if (addLiterals) {
                    // Make literal
                    if (!this.literals[nodeId]) {
                        this.literals[nodeId] = {
                            id:        nodeId,
                            name:      JSON.stringify(literalName),
                            variables: this.getVariables(literalName).sort(),
                            clauseIds: []
                        };
                    }

                    // Add clause to literal (`i` is the clause id)
                    if (!this.literals[nodeId].clauseIds.includes(i)) {
                        this.literals[nodeId].clauseIds.push(i);
                    }
                }
            }
        }
        return {nodes: nodes, edges: edges};
    },

    // Hide `this.clauses.data` nodes and edges from the network
    // In particular, this function just replaces the previous network with a
    // new empty one.
    hideClauses: function() {
        // Clear literals and hide literal information box
        this.literals = {};
        let literalInfo = document.getElementById('smts-content-cnf-literal-info');
        literalInfo.classList.add('smts-hidden');
        // Create an empty network
        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);
        let visContainer = document.getElementById('smts-content-cnf-container');
        let visData  = {nodes: this.nodes, edges: this.edges};
        let visOptions = this.options;
        this.network = new vis.Network(visContainer, visData, visOptions);
    },

    // Hide `this.learnts.data` nodes and edges from the network
    hideLearnts: function() {
        if (this.learnts) {
            // Update literals of unary learnts nodes color
            let nodes = [];
            for (let node of this.learnts.data.nodes) {
                if (node.isUnary) {
                    nodes.push({
                        id: node.is,
                        color: this.color.node.normal
                    });
                }
            }
            this.nodes.update(nodes);

            // Store the edge ids in an array and remove them from the dataset at
            // once for performance reasons.
            let edgeIds = [];
            for (let edge of this.learnts.data.edges) {
                --this.edgesCounts[edge.id];
                if (this.edgesCounts[edge.id] <= 0) {
                    edgeIds.push(edge.id);
                }
            }
            this.edges.remove(edgeIds);
        }
    },

    // Show `this.clauses.data` nodes and edges on the network
    // In particular, this function creates a brand new network containing
    // clauses nodes and edges.
    // N.B.: The simulation needed to place nodes and edges in the correct
    // positions might end up taking between 10 to 30 seconds to render the
    // network (nothing will be shown in the meantime).
    showClauses: function() {
        // Add nodes to DataSet
        // Store the node ids in an array and insert them in the dataset at
        // once for performance reasons.
        this.nodesCounts = {};
        let nodes = [];
        if (this.clauses) {
            for (let node of this.clauses.data.nodes) {
                let count = this.nodesCounts[node.id];
                if (!count || count <= 0) {
                    nodes.push({
                        id: node.id
                    });
                    this.nodesCounts[node.id] = 1;
                } else {
                    ++this.nodesCounts[node.id];
                }
            }
        }
        this.nodes = new vis.DataSet(nodes);

        // Add edges to DataSet
        // Store the edge ids in an array and insert them in the dataset at
        // once for performance reasons.
        this.edgesCounts = {};
        let edges = [];
        if (this.clauses) {
            for (let edge of this.clauses.data.edges) {
                let count = this.edgesCounts[edge.id];
                if (!count || count <= 0) {
                    edges.push({
                        id: edge.id,
                        from: edge.from,
                        to: edge.to
                    });
                    this.edgesCounts[edge.id] = 1;
                } else {
                    ++this.edgesCounts[edge.id];
                }
            }
        }
        this.edges = new vis.DataSet(edges);

        // Make network
        let visContainer = document.getElementById('smts-content-cnf-container');
        let visData  = {nodes: this.nodes, edges: this.edges};
        let visOptions = this.options;
        this.loadAnimationOn();
        this.network = new vis.Network(visContainer, visData, visOptions);

        // Stop physics once the network is rendered
        this.network.on('stabilizationIterationsDone', () => {
            this.network.setOptions({physics: false});
            this.loadAnimationOff();
        });

        // Show literal info on node click
        this.network.on('click', (data) => {
            if (data.nodes.length > 0) {
                // Generate information about first selected node
                this.generateLiteralInfo(data.nodes[0]);
            } else {
                // Remove literal information box
                this.generateLiteralInfo(null);
            }
        });
    },

    // Show `this.learnts.data` edges (not nodes) on the network
    // The edges added this way are not part of the physics simulation needed
    // to place the elements in the network, so it should not move elements
    // around.
    showLearnts: function() {
        if (this.learnts) {
            // Update literals of unary learnts nodes color
            let nodes = [];
            for (let node of this.learnts.data.nodes) {
                if (node.isUnary) {
                    nodes.push({
                        id: node.id,
                        color: this.color.node.unary
                    });
                }
            }
            this.nodes.update(nodes);

            // Store the edge ids in an array and insert them in the dataset at
            // once for performance reasons.
            let edges = [];
            for (let edge of this.learnts.data.edges) {
                let count = this.edgesCounts[edge.id];
                if (!count || count <= 0) {
                    edges.push({
                        id:      edge.id,
                        from:    edge.from,
                        to:      edge.to,
                        color:   this.color.edge.learnt,
                        physics: false
                    });
                    this.edgesCounts[edge.id] = 1;
                } else {
                    ++this.edgesCounts[edge.id];
                }
            }
            this.edges.add(edges);
        }
    },

    // Check if current clauses CNF matches given instance name and node path
    // @param {string} instanceName: Name of the node's instance.
    // @param {string} nodePath: Path of the node.
    // @return {boolean}: True if the given parameters match the current
    // clauses CNF, false otherwise (or if there is no current clauses CNF).
    isSameClauses: function(instanceName, nodePath) {
        return (this.clauses                               &&
                this.clauses.instanceName === instanceName &&
                this.clauses.nodePath     === nodePath);
    },

    // Check if current learnts CNF matches given instance name and solver address
    // @param {string} instanceName: Name of the solver's instance.
    // @param {string} solverAddress: Address of the solver.
    // @return {boolean}: True if the given parameters match the current
    // learnts CNF, false otherwise (or if there is no current learnts CNF).
    isSameLearnts: function(instanceName, solverAddress) {
        return (this.learnts                                &&
                this.learnts.instanceName  === instanceName &&
                this.learnts.solverAddress === solverAddress);
    },

    // Get CNF through websocket and give it to `processCnf` function
    // This function serves as a wrapper around websocket connection. It
    // connects to the server, and asks for a CNF stored in a file named
    // `pipename`. Once the CNF is received, the `processCnf` function uses it,
    // then the socket is automatically disconnected.
    // @param {string} pipename: Name of the pipe where the CNF is stored.
    // @param {function} processCnf: Function that takes a CNF a processes it.
    getCnf: function(pipename, processCnf) {
        let socket = io();
        socket.on('get-cnf', cnf => { processCnf(cnf); socket.disconnect() });
        socket.on('connect', () => socket.emit('get-cnf', pipename));
    },

    // Update clauses CNF to be the one corresponding to given parameters
    // Updating the clauses implies updating learnts too.
    // The function requests data and updates the network only if the newly
    // requested clauses (or learnts) are from a different node (or solver).
    // @param {string} instanceName: The name of the current instance.
    // @param {string} nodePath: The path of the node.
    // @param {string} solverAddress: The address of the solver. If none is
    // given, the learnts are not displayed.
    updateClauses: function(instanceName, nodePath, solverAddress) {
        if (!instanceName || !nodePath) {
            // No clauses given, display an empty network
            this.hideClauses();
            this.clauses = null;
            // Update (remove) learnts
            this.updateLearnts(null, null);
        } else if (!this.isSameClauses(instanceName, nodePath)) {
            // New clauses don't match current ones, make CNF request
            $.ajax({
                url: `/cnf/clauses?instanceName=${instanceName}&value=${nodePath}`,
                type: 'GET',
                success: pipename => {
                    if (pipename) {
                        this.getCnf(pipename, cnfClauses => {
                            if (cnfClauses) {
                                this.hideClauses();
                                this.clauses = {
                                    instanceName: instanceName,
                                    nodePath:     nodePath,
                                    data:         this.getData(cnfClauses, true, false)
                                };
                                this.showClauses();
                                // Update learnts
                                this.updateLearnts(instanceName, solverAddress);
                            } else {
                                console.log('No CNF clauses');
                            }
                        });
                    } else {
                        smts.tools.error('Missing CNF clauses pipename');
                    }
                }
            });
        } else {
            // New clauses match current one, no need to update the CNF
            // Still, update learnts
            this.updateLearnts(instanceName, solverAddress);
        }
    },

    // Update learnts CNF to be the one corresponding to given parameters
    // The function requests data and updates the network only if the newly
    // requested learnts are from a different solver.
    // @param {string} instanceName: The name of the current instance.
    // @param {string} solverAddress: The address of the solver.
    updateLearnts: function(instanceName, solverAddress) {
        if (!instanceName || !solverAddress) {
            // No learnts given, remove learnts from network
            this.hideLearnts();
            this.learnts = null;
        } else if (!this.isSameLearnts(instanceName, solverAddress)) {
            // New learnts don't match current ones, make CNF request
            $.ajax({
                url: `/cnf/learnts?instanceName=${instanceName}&value=${solverAddress}`,
                type: 'GET',
                success: pipename => {
                    if (pipename) {
                        this.getCnf(pipename, cnfLearnts => {
                            if (cnfLearnts) {
                                this.hideLearnts();
                                this.learnts = {
                                    instanceName: instanceName,
                                    solverAddress: solverAddress,
                                    data: this.getData(cnfLearnts, false, true)
                                };
                                let isShowLearnts = document.getElementById('smts-option-learnts').checked;
                                if (isShowLearnts) this.showLearnts();
                            } else {
                                console.log('No CNF learnts');
                            }
                        });
                    } else {
                        smts.tools.error('Missing CNF learnts pipename');
                    }
                }
            });
        }
    },


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // OTHER
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Toggle learnts visualization on network
    toggleLearnts: function() {
        let isShowLearnts = document.getElementById('smts-option-learnts').checked;
        isShowLearnts ? this.showLearnts() : this.hideLearnts();
    },

    // Turn on loading animation
    // The animation should turned on while the network is being rendered.
    loadAnimationOn: function() {
        let tab = document.getElementById('smts-content-navbar-smt').firstChild;
        let animations = [ 'CNF.', 'CNF..', 'CNF...' ];
        let animationCurrent = 0;
        this.loadAnimationInterval = setInterval(() => {
            animationCurrent = (animationCurrent + 1) % animations.length;
            tab.innerHTML = animations[animationCurrent];
        }, 300);
    },

    // Turn off loading animation
    // The animation should be turned off once the network has been rendered.
    loadAnimationOff: function() {
        clearInterval(this.loadAnimationInterval);
        let tab = document.getElementById('smts-content-navbar-smt').firstChild;
        tab.innerHTML = 'CNF';
    },


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MAIN
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Load clauses and learnts for a particular node and solver
    // @param {string} instanceName: The name of the current instance.
    // @param {string} nodePath: The path of the node.
    // @param {string} solverAddress: The address of the solver. If none is
    // given, the learnts are not displayed.
    load: function(instanceName, nodePath, solverAddress) {
        this.updateClauses(instanceName, nodePath, solverAddress);
    }
};