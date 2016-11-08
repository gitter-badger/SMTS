//
// Created by Matteo on 21/07/16.
//

#ifndef CLAUSE_SHARING_PROCESSSOLVER_H
#define CLAUSE_SHARING_PROCESSSOLVER_H

#include <atomic>
#include "lib/lib.h"


enum Status {
    unknown, sat, unsat
};

struct Task {
    const enum {
        incremental, resume
    } command;
    std::string smtlib;
    uint8_t partitions;
};


class SolverProcess : public Process {
private:
    std::atomic<Socket *> lemmas;
    Pipe pipe;
    std::string instance;

    void main() {
        this->init();
        this->report();
        std::thread t([&] {
            std::map<std::string, std::string> header;
            std::string payload;
            while (true) {
                // receives both commands from the server(forwarded by SolverServer) and from SolverServer.
                // if command=local the answer is built here and delivered to SolverServer
                // otherwise the solver is interrupted and the message forwarder through pipe
                this->reader()->read(header, payload);
                if (header.count("command") == 0)
                    continue;
                if (header["command"] == "local" && header.count("local") == 1) {
                    if (header["local"] == "report")
                        this->report();
                    else if (header["local"] == "disable-lemmas")
                        this->lemmas.store(nullptr);
                    continue;
                }
                this->interrupt();
                this->pipe.writer()->write(header, payload);
            }
        });
        this->solve();
    }

    // here the module can edit class fields
    void init();

    // class field are read only
    void solve();


    void partition(uint8_t);

    // async interrupt the solver
    void interrupt();

    void report() {
        this->writer()->write(this->header, "");
    }

    void report(Status status) {
        auto header = this->header;
        if (status == Status::sat)
            header["status"] = "sat";
        else if (status == Status::unsat)
            header["status"] = "unsat";
        else return;//header["status"] = "unknown";
        this->writer()->write(header, "");

    }

    void report(const std::vector<std::string> &partitions, const char *error = nullptr) {
        auto header = this->header;
        std::stringstream payload;
        if (error != nullptr)
            header["error"] = error;
        ::join(payload, "\n", partitions);
        header["partitions"] = std::to_string(partitions.size());
        this->writer()->write(header, payload.str());
    }

    Task wait() {
        std::map<std::string, std::string> header;
        std::string payload;
        this->pipe.reader()->read(header, payload);
        if (header["command"] == "incremental") {
            return Task{
                    .command=Task::incremental,
                    .smtlib=payload
            };
        }
        if (header["command"] == "partition" && header.count("partitions") == 1) {
            this->partition((uint8_t) atoi(header["partitions"].c_str()));
        }
        return Task{
                .command=Task::resume
        };
    }

    void lemma_push(const std::vector<NetLemma> &lemmas) {
        if (!is_sharing() || lemmas.size() == 0)
            return;

        auto header = this->header;
        std::stringstream payload;

        ::join(payload, "\n", lemmas);

        header["separator"] = "\n";
        header["lemmas"] = std::to_string(lemmas.size());

        try {
            this->lemmas.load()->write(header, payload.str());
        } catch (SocketException) {
            header["warning"] = "lemma push failed";
            this->writer()->write(header, "");
        }
    }

    void lemma_pull(std::vector<NetLemma> &lemmas) {
        if (!is_sharing())
            return;

        auto header = this->header;
        std::string payload;
        header["exclude"] = this->lemmas.load()->get_local().toString();

        try {
            Socket lemma_pull(this->lemmas.load()->get_remote().toString());
            lemma_pull.write(header, "");
            lemma_pull.read(header, payload);
        } catch (SocketException &) {
            header["warning"] = "lemma pull failed";
            this->writer()->write(header, "");
            return;
        }

        if (header["name"] != this->header["name"]
            || header["node"] != this->header["node"]
            || header.count("separator") == 0)
            return;

        ::split(payload, header["separator"], [&](const std::string &sub) {
            if (sub.size() == 0)
                return;
            try {
                lemmas.push_back(NetLemma(sub));
            } catch (Exception &) {
                header["warning"] = "lemma load failed";
                this->writer()->write(header, "");
            }
        });
    }

public:
    SolverProcess(Socket *lemmas,
                  std::map<std::string, std::string> header,
                  std::string instance) :
            lemmas(lemmas),
            pipe(Pipe()),
            instance(instance),
            header(header) {
        this->start();
    }

    std::map<std::string, std::string> header;

    bool is_sharing() {
        return this->lemmas != nullptr;
    }

    static const char *solver;
};

#endif //CLAUSE_SHARING_PROCESSSOLVER_H
