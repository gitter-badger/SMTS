//
// Created by Matteo on 24/10/2016.
//

#include <iostream>
#include <fstream>
#include <vector>
#include "fixedpoint.h"


z3::context context;

void push(Z3_fixedpoint_lemma_set s) {
    std::vector<std::string> lemmas;
    char *l;
    while ((l = (char *)Z3_fixedpoint_lemma_pop(context, s)) != nullptr) {
        lemmas.push_back(l);
        free(l);
    }
    std::cout << "SERVER client pushed "<< lemmas.size() << "\n";
    //send them to server
}

void pull(Z3_fixedpoint_lemma_set s) {
    // ask for them to the server
    std::vector<std::string> lemmas;
    lemmas.push_back("lemma1");
    lemmas.push_back("lemma2");
    lemmas.push_back("lemma3");

    std::cout << "SERVER client pulled with "<< lemmas.size() << "\n";

    for (auto l:lemmas) {
        Z3_fixedpoint_lemma_push(context, s, l.c_str());
    }
}

int main(int argc, char **argv) {
    int i;
    z3::fixedpoint f(context);
    z3::params p(context);
    p.set(":engine", context.str_symbol("spacer"));
    f.set(p);

    z3::solver solver(context);

    if (argc > 1) {
        std::ifstream file(argv[1]);
        if (!file.is_open()) {
            exit(-1);
        }

        std::string content;
        file.seekg(0, std::ios::end);
        content.resize((unsigned long) file.tellg());
        file.seekg(0, std::ios::beg);
        file.read(&content[0], content.size());
        file.close();

        Z3_ast_vector v = Z3_fixedpoint_from_string(context, f, content.c_str());
        Z3_ast a = Z3_ast_vector_get(context, v, 0);

        Z3_fixedpoint_set_lemma_pull_callback(context, f, pull);
        Z3_fixedpoint_set_lemma_push_callback(context, f, push);

        Z3_lbool res = Z3_fixedpoint_query(context, f, a);
        if (res == Z3_L_TRUE) std::cout << "VERIFICATION FAILED\n";
        else if (res == Z3_L_FALSE) std::cout << "VERIFICATION SUCCESSFUL\n";

    }
}