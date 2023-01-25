import { APP_NAME, WEBSERVER_ATTRIBUTES } from '../constants/constants';

export const deploymentManifest = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name: APP_NAME },
    spec: {
        replicas: 12,
        selector: {
            matchLabels: { app: APP_NAME }
        },
        template: {
            metadata: {
                labels: { app: APP_NAME }
            },
            spec: {
                containers: [{
                    name: APP_NAME,
                    image: WEBSERVER_ATTRIBUTES.ECR_IMAGE,
                    ports: [{ containerPort: WEBSERVER_ATTRIBUTES.PORTS_CONFIG.port }],
                    env: WEBSERVER_ATTRIBUTES.ENVIRONMENT_VARIABLES,
                    imagePullPolicy: "Always",
                }],
            },
        }
    }
};

export const serviceManifest = {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name: APP_NAME },
    spec: {
        type: "LoadBalancer",
        selector: { app: APP_NAME },
        ports: [WEBSERVER_ATTRIBUTES.PORTS_CONFIG]
    }
};
