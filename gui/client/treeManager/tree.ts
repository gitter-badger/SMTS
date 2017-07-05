module TreeManager {

    export class Tree {
        events: Event[] = [];
        solver: Array<[string, string]> = [];
        solvers: Solver[] = [];
        treeView: Node; // This is the tree seen in the visualization

        constructor() {
        }

        createEvents(array) {
            let time = array[0].ts;
            let diff;
            for (let item of array) {
                let event = new Event(item);
                diff = item.ts - time;
                event.setTs(diff);
                this.events.push(event);
            }
        }

        arrangeTree(n) {
            let treeView = new Node([], 'AND'); // The root is an 'AND'

            for (let i = 0; i <= n; ++i) {
                let event = this.events[i];
                let type = event.event;

                switch (type) {
                    case 'OR':
                    case 'AND':
                        treeView.insertNode(new Node(JSON.parse(event.data.node), type));
                        break;

                    case '+':
                    case '-':
                        treeView.updateNode(event.node, type, event.solver);
                        break;

                    case 'STATUS':
                        treeView.updateNode(event.node, type, event.data.report);
                        break;

                    case 'SOLVED':
                        treeView.updateNode(event.node, type, event.data.status);
                        treeView.setStatus(event.data.status);
                        break;
                }
            }

            this.treeView = treeView;
        }

        getTreeView() {
            return this.treeView;
        }

        assignSolvers(begin: number, end: number) {

            // Reset solvers
            for (let i = 0; i < this.solvers.length; ++i) {
                this.solvers[i].setNode(null);
                this.solvers[i].setData(null);
            }

            for (let i = begin; i <= end; ++i) {
                let event = this.events[i];
                switch (event.event) {
                    case '+':
                        for (let j = 0; j < this.solvers.length; ++j) {
                            let solver = this.solvers[j];
                            if (solver.name == event.name) {
                                solver.setNode(event.node);
                                solver.setData(event.data);
                            }
                        }
                        break;

                    case '-':
                        for (let j = 0; j < this.solvers.length; ++j) {
                            let solver = this.solvers[j];
                            if (solver.name == event.name) {
                                solver.setNode(null);
                                solver.setData(null);
                            }
                        }
                        break;
                }
            }
        }

        //getEvents(x) returns the first x events
        getEvents(n: number) {
            if (n == this.events.length) {
                return this.events;
            }
            return this.events.slice(0, n);
        }

        // Insert solvers in this.solvers only if not already present
        initializeSolvers(array) {
            let isPresent;
            for (let item of array) {
                isPresent = false;
                for (let solver of this.solvers) {
                    if (solver.name == item.solver) {
                        isPresent = true;
                    }
                }
                if (!isPresent) {
                    this.solvers.push(new Solver(item.solver));
                }
            }
        }
    }
}