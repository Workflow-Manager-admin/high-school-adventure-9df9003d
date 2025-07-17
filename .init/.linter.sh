#!/bin/bash
cd /home/kavia/workspace/code-generation/high-school-adventure-9df9003d/frontend_react_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

