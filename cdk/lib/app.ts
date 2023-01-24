#!/usr/bin/env node
import { App, StackProps } from 'aws-cdk-lib';
import { APP_NAME, STACK_ENVIRONMENTS } from './constants/constants';
import { personioWebserverStack } from './personio-webserver-stack';

/**
 * For the purposes of deploying the application
 * to multiple environments, we leverage the
 * "generateStacks" function by passing in
 * a "stacksConfig" dictionary containing the
 * stage, accounts and regions.
 */
function generateStack(app: App, stacksConfig: any) {

    let account;
    let region;

    for (let stage in stacksConfig) {
        if (stage === "dev") {
            account = stacksConfig[stage]["account"];
            region = stacksConfig[stage]["region"];
        } else {
            // Design for multiple prod waves
            for (let prodWave in stacksConfig[stage]) {
                account = stacksConfig[stage][prodWave]["account"];
                region = stacksConfig[stage][prodWave]["region"];
            }
        };

        let stackName = `${APP_NAME}-${account}-${region}-${stage}`;
        const stackProps: StackProps = {
            stackName: stackName,
            env: { account, region },
        };

        new personioWebserverStack(
            app,
            stackName,
            stackProps
        );
    };
};

const app = new App();
generateStack(app, STACK_ENVIRONMENTS);