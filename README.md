## Compilation

### Dependencies

SMTS uses CMake as a build system generator. You need at least CMake 3.2.

SMTS depends also on SQLite and the dependencies of the enabled solvers.

### Compilation with OpenSMT enabled

Warning! SMTS is compatible with OpenSMT 2.0.1, but *not* with OpenSMT's HEAD!

We assume you are in the root folder of SMTS

```
mkdir build && cd build  // Create and navigate to the build directory

cmake -DOPENSMT2_DIR=<path_to_opensmt_installation> .. // Run cmake while instructing it where it should find OPENSMT2. <path_to_opensmt_installation> is the folder where you have installed OpenSMT 2.0.1

make 

```

## Running parallel OpenSMT locally
The easiest way how to run multiple instances of OpenSMT in parallel locally is to use the helper script `smts.py` located in the `server` folder in SMTS' root folder.

For that you need to prepare a list of instances that you want to solve in a python configuration file. For example if you want to solve an instance `my_hard_problem.smt2` located in the folder `<path_to_my_benchmarks>` you can create a file `my_config.py` with the following line
```
files_path=['<path_to_my_benchmark>/my_hard_problem.smt2']
```

Then you can run SMTS using the following command:
```
[python3] server/smts.py -c my_config.py -o N
```
Where N is a number representing how many instances of OpenSMT should be run.

By default the server will keep running even after the instance has been solver, so you can kill it with `Ctrl+C`.

SMTS is very flexible and there are many options that can be configured, including turning on lemma sharing and partitioning.