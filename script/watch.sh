#!/bin/bash

set -e

PATH=$(yarn bin):$PATH
babel --watch --source-maps -d lib src &
flow-copy-source -w -v src lib
