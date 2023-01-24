export const APP_NAME = "personio-challenge";

/**
 * The "STACK_ENVIRONMENTS" map represented below can
 * be used for defining a CDK pipeline if deploying
 * the application to multiple environments.
 */
export const STACK_ENVIRONMENTS = {
    "dev": {
        account: "249422412389",
        region: "eu-west-1"
    },
    "prod": {
        "prod-wave-1": {
            account: "249422412389",
            region: "eu-west-1"
        }
    }
};

/**
 * Webserver attributes are defined here and referenced
 * in manifests.ts to ensure definition consistency.
 */
export const WEBSERVER_ATTRIBUTES = {
    ECR_IMAGE: "249422412389.dkr.ecr.eu-west-1.amazonaws.com/dmur-challenge:latest",
    ENVIRONMENT_VARIABLES: [
        {
            name: "HELLO",
            value: "Hello"
        }
    ],
    PORTS_CONFIG: { protocol: "TCP", port: 80, targetPort: 8080 }
};