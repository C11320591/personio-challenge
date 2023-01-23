import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Cluster, KubernetesVersion, AlbControllerVersion } from 'aws-cdk-lib/aws-eks';
import { APP_NAME } from './constants/constants';
import { deploymentManifest, serviceManifest  } from './manifests/manifests';

export class personioWebserverStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {

    super(scope, id, props);

    const clusterName: string = `${APP_NAME}-eks-cluster`; 

    const cluster: Cluster = new Cluster(this, clusterName, {
      version: KubernetesVersion.V1_24,
      albController: { version: AlbControllerVersion.V2_2_4 },
      defaultCapacity: Stack.of(this).availabilityZones.length
    });

    cluster.addManifest(`${APP_NAME}-deployment-manifest`, deploymentManifest);
    cluster.addManifest(`${APP_NAME}-service-manifest`, serviceManifest);
  }
}