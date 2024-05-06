// Import the necessary modules
import { Stack, StackProps, Construct, CfnOutput } from '@aws-cdk/core';
import { Vpc, SubnetType, SecurityGroup, InstanceType, InstanceClass, InstanceSize, Port, MachineImage, Instance } from '@aws-cdk/aws-ec2'; // Import Instance from @aws-cdk/aws-ec2
import { LoadBalancer, TargetGroup, Protocol } from '@aws-cdk/aws-elasticloadbalancingv2';
import { UserData } from '@aws-cdk/aws-ec2/lib/user-data';

// Define the CorpWebStackProps interface
interface CorpWebStackProps extends StackProps {
  instanceType: string;
  keyPairName: string;
  yourIp: string;
}

// Define the CorpWebStack class
export class CorpWebStack extends Stack {
  constructor(scope: Construct, id: string, props: CorpWebStackProps) {
    super(scope, id, props);

    // Parameters
    const { instanceType, keyPairName, yourIp } = props;

    // VPC
    const vpc = new Vpc(this, 'EngineeringVpc', {
      cidr: '10.0.0.0/18',
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration: [
        {
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
          name: 'PublicSubnet1'
        },
        {
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
          name: 'PublicSubnet2'
        }
      ]
    });

    // Security Group
    const securityGroup = new SecurityGroup(this, 'WebserversSG', {
      vpc,
      description: 'Enable SSH and HTTP access'
    });
    securityGroup.addIngressRule(Port.tcp(22), yourIp, 'SSH access from your IP');
    securityGroup.addIngressRule(Port.tcp(80), '0.0.0.0/0', 'HTTP access from anywhere');

    // Application Load Balancer
    const loadBalancer = new LoadBalancer(this, 'EngineeringLB', {
      vpc,
      internetFacing: true
    });
    loadBalancer.addSecurityGroup(securityGroup);

    // Target Group
    const ITargetGroup = new TargetGroup(this, 'EngineeringWebservers', {
      vpc,
      port: 80,
      protocol: Protocol.HTTP,
      targets: []
    });

    // EC2 Instances
    const web1 = new Instance(this, 'web1', {
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO),
      machineImage: MachineImage.genericLinux({
        'us-east-1': 'ami-07caf09b362be10b8 ' //my AMI 
      }),
      keyName: keyPairName,
      vpc,
      securityGroup,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      userData: UserData.forLinux()
        .addCommands(
          'yum update -y',
          'yum install -y git httpd php',
          'service httpd start',
          'chkconfig httpd on',
          'aws s3 cp s3://seis665-public/index.php /var/www/html/'
        )
    });

    const web2 = new Instance(this, 'web2', {
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO),
      machineImage: MachineImage.genericLinux({
        'us-east-1': 'ami-07caf09b362be10b8'
      }),
      keyName: keyPairName,
      vpc,
      securityGroup,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      userData: UserData.forLinux()
        .addCommands(
          'yum update -y',
          'yum install -y git httpd php',
          'service httpd start',
          'chkconfig httpd on',
          'aws s3 cp s3://seis665-public/index.php /var/www/html/'
        )
    });

    // Add targets to target group
    ITargetGroup.addTarget(web1);
    ITargetGroup.addTarget(web2);

    // Output
    new CfnOutput(this, 'WebUrl', {
      value: loadBalancer.loadBalancerDnsName,
      description: 'URL of the load balancer'
    });
  }
}
