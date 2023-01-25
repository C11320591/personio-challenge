# Overview of the infrastructure design

For this challenge, I used the AWS CDK for the purposes of creating infrastructure to host the webserver which is managed by Kubernetes.

### Stack Definition
The CDK stack is relatively simple. It contains a single but powerful construct; - `EKS.Cluster` ([docs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.Cluster.html)). By omitting constructor properties related to the AWS VPC, CDK takes care of creating the required resources (Subnets, NAT Gateways, Elastic IPs, etc) for hosting the cluster. I did however an optional property in the constructor:
* _**defaultCapacity**_ - a value that defaults to 2 but is overwritten here to deploy a single host in each availability zone.

### Application Deployment
Additionally, the stack includes two Kubernetes manifests (Deployment, Service) that are used to deploy the application upon stack creation. Of course, this could be done manually by connecting to the cluster post-infrastructure creation and applying the manifests using `kubectl` – however, I wanted to demonstrate that how can be achieved via CDK.

A possible disadvantage of applying the cluster configuration via CDK is running the risk of manually updating the cluster (using `kubectl`) rendering the stack definition as stale until it is manually updated.

### Traffic Distribution
The webserver is deployed to EC2 Worker Nodes in multiple availability zones. This is configured to ensure that the webserver remains online in the event that a zone(s) becomes unreachable. Additionally, the Kubernetes service type is configured as _“LoadBalancer”_ which places the EC2 Worker Nodes behind an AWS Classic ELB to ensure that inbound traffic is evenly distributed amongst the Pods running the webserver
(See `serviceManifest.spec.type` in the [manifest](https://github.com/C11320591/personio-challenge/blob/master/cdk/lib/manifests/manifests.ts)).

---

## CI / CD

> “Description of how you would setup a CI/CD pipeline for this project”

To transform this application into a CI/CD pipeline, we can leverage the CodePipeline construct ([docs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines.CodePipeline.html)) for deploying the application to multiple stacks (for example, deploying to multi-region application hosted in the same AWS account).

In the application code, I have included a dictionary object in the [constants.ts](https://github.com/C11320591/personio-challenge/blob/master/cdk/lib/constants/constants.ts) file (`"STACK_ENVIRONMENTS"`) which could be used to define the pipeline structure and, for example, configure a pre-prod environment that could be used for testing changes before prod release.

> “Describe how each of the necessary deployment steps works”

1. Store the application in a AWS CodeCommit repository. Here, changes are made to the application source code and Dockerfile.
```
buildspec.yml
Dockerfile
src/
     main.go
```

2. After a new revision is published in the repository, it is pulled and built in AWS CodeBuild per build spec instructions and the resulting Docker image is pushed to ECR.
```
version: 0.2
env:
    variables:
        repo: "personio-challenge"
        tag: "latest"
...
phases:
    pre_build:
        commands:
            - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
    build:
        commands:
            - docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$repo:$tag
    post_build:
        commands:
            - docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$repo:$tag
...
```

3. Implement an Amazon EventBridge rule that invokes a Lambda function for updating the Kubernetes cluster using `kubectl`. This step is responsible for launching cluster Pods with the most recent revision of the container image pushed to ECR in the above step.

> “Describe how you would rollback to a previously deployed version of the application”

We could leverage the below commands to revert to a previous revision of a cluster deployment:

1. Update the kubeconfig so you can communicate with the cluster
```
aws eks update-kubeconfig
```
2. Then, assuming you know which deployment to revert to (can be identified using `kubectl get deployments`), rollback can be achieved using the below command:
```
kubectl rollout undo deployment/<deployment-name>
```

---

# Future Improvements

### HTTPS
Although it is lightweight and does not process any confidential data, we could reconfigure the Go application to use TLS making it secure. I briefly looked at the Go documentation and understand that it just needs a couple of extra parameters: a certificate (which was generated in the alpine image in the Dockerfile) and a key ([example provided on Go documentation](https://pkg.go.dev/net/http#example-ListenAndServeTLS)).

### EC2 AutoScaling
In the interest of maintaining high availability, we could manually define the AutoScaling Group configuration for the EC2 Worker Nodes – for instance, we could configure a min/max capacity so the application scales out and is not isolated to a subset of EC2 Instances (risk of saturation in case of multiple Kubernetes pods on small set of hosts).

### Systems Manager
Since the webserver is hosted on EC2 (Worker Nodes), we manage the underlying hosts. This means we are responsible for applying updates and security patches. To do so, we could onboard the EC2 instances with [AWS Systems Manager](https://docs.aws.amazon.com/systems-manager/index.html) which provides access to multiple host management tool such as Patch Manager and Run Command. Alternatively, we could investigate whether to deploy this application on Fargate which abstracts the OS layer, however comes at a higher expense.

### Breakglass solution for updating application
Since updates that are deployed via CDK can be slow (depending on the change) - especially if rolling out a change via a CDK Pipeline - incidents may occur that require a quick fix e.g. pulling the latest image from Docker which contains a bug fix.

So, design a breakglass solution for deploying changes:
1. Pull the current Kubernetes manifest file(s) from - for example - Amazon S3.
1. Make necessary changes.
1. Use `kubectl -f apply <manifest>` to deploy changes.
1. Replace manifest in Amazon S3.
1. Log event in DynamoDB audit table.