#!/bin/sh
# Rebuild policy.mjs from the working draft with imports pointed at the stub + repo policykit.
W=/home/harsh/jev-buildathon/work
node --check $W/legal-policies.mjs && sed -e "s#from \"failproofai\"#from \"$W/replay/stub.mjs\"#" -e "s#\.\./\.\./\.\./\.\./policykit/index.mjs#/home/harsh/jev-buildathon/policykit/index.mjs#" $W/legal-policies.mjs > $W/replay/policy.mjs && echo built
