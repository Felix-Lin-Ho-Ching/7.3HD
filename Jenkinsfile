pipeline {
  agent any
  options {
    ansiColor('xterm')
    timestamps()
  }
  environment {
    DOCKER_IMAGE = "sugardark/sit753-7-3hd-pipeline"
    REGISTRY_URL = "https://index.docker.io/v1/"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.SHORT_COMMIT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          echo "Commit: ${env.SHORT_COMMIT}"
        }
      }
    }

    stage('Build & Push Image') {
      steps {
        script {
          sh """
            docker build -t ${DOCKER_IMAGE}:${SHORT_COMMIT} .
            docker tag ${DOCKER_IMAGE}:${SHORT_COMMIT} ${DOCKER_IMAGE}:latest
          """
          withDockerRegistry(credentialsId: 'dockerhub', url: REGISTRY_URL) {
            sh """
              docker push ${DOCKER_IMAGE}:${SHORT_COMMIT}
              docker push ${DOCKER_IMAGE}:latest
            """
          }
        }
      }
    }

stage('Test (Jest in container)') {
  steps {
    script {
      sh 'docker inspect -f . node:20-alpine || docker pull node:20-alpine'

      docker.image('node:20-alpine').inside("-u 1000:1000") {
        sh '''
          set -e
          npm ci
          mkdir -p reports/junit

          export NODE_ENV=test
          export NODE_OPTIONS=--experimental-vm-modules

          # Tell jest-junit where to write the report
          export JEST_JUNIT_OUTPUT_DIR=reports/junit
          export JEST_JUNIT_OUTPUT_NAME=junit.xml

          # Run tests with reporters explicitly set
          npx jest --ci --runInBand --forceExit --reporters=default --reporters=jest-junit

          # Prove the file exists for Jenkins
          ls -l reports/junit || true
        '''
      }
    }
  }
  post {
    always {
      junit 'reports/junit/*.xml'
    }
  }
}

  stage('Code Quality (SonarQube)') {
  steps {
    withCredentials([
      string(credentialsId: 'sonar-host-url', variable: 'SONAR_HOST_URL'),
      string(credentialsId: 'sonar-token',    variable: 'SONAR_TOKEN')
    ]) {
      sh '''
        set -e

        # ===== verify the file is in the Jenkins workspace =====
        echo "PWD in Code Quality: $PWD"
        ls -al
        if [ -f sonar-project.properties ]; then
          echo "Found sonar-project.properties:"
          cat sonar-project.properties
        else
          echo "sonar-project.properties is MISSING in workspace" >&2
          exit 1
        fi

        # ===== run scanner against this directory explicitly =====
        docker run --rm --add-host=host.docker.internal:host-gateway \
          -e SONAR_HOST_URL="$SONAR_HOST_URL" \
          -e SONAR_LOGIN="$SONAR_TOKEN" \
          -v "$PWD:/usr/src" -w /usr/src \
          sonarsource/sonar-scanner-cli:latest \
          -Dsonar.host.url="$SONAR_HOST_URL" \
          -Dsonar.login="$SONAR_TOKEN" \
          -Dsonar.projectBaseDir=/usr/src \
          \
          # ----- belt-and-suspenders: pass required props inline -----
          -Dsonar.projectKey=sit753-7-3hd \
          -Dsonar.projectName="SIT753-7.3HD" \
          -Dsonar.sources=src \
          -Dsonar.tests=tests,src/__tests__ \
          -Dsonar.test.inclusions="**/*.test.js,**/*.spec.js" \
          -Dsonar.exclusions="**/node_modules/**,**/reports/**"
      '''
    }
  }
}


    stage('Security (optional)') {
      steps {
        script {
          // Trivy: fail on HIGH/CRITICAL vulns in the built image
          sh """
            docker run --rm \
              -v /var/run/docker.sock:/var/run/docker.sock \
              -v "$WORKSPACE/.trivycache:/root/.cache/" \
              aquasec/trivy:0.54.1 image \
                --exit-code 1 --severity HIGH,CRITICAL \
                ${DOCKER_IMAGE}:${SHORT_COMMIT}
          """
        }
      }
    }

    stage('Deploy: Staging') {
      steps {
        sh """
          set -e
          docker rm -f app-staging || true
          docker run -d --name app-staging -p 3001:3000 \
            -e APP_VERSION=${SHORT_COMMIT} \
            ${DOCKER_IMAGE}:${SHORT_COMMIT}
          # wait for health
          for i in {1..30}; do curl -fsS http://localhost:3001/healthz && break; sleep 1; done
        """
      }
    }

    stage('Release: Production') {
      steps {
        sh """
          set -e
          docker rm -f app-prod || true
          docker run -d --name app-prod -p 3000:3000 \
            -e APP_VERSION=${SHORT_COMMIT} \
            ${DOCKER_IMAGE}:${SHORT_COMMIT}
          for i in {1..30}; do curl -fsS http://localhost:3000/healthz && break; sleep 1; done
        """
      }
    }

    stage('Monitoring Check') {
      steps {
        sh '''
          set -e
          curl -fsS http://localhost:3000/healthz | grep -q '"ok":true'
          curl -fsS http://localhost:3000/metrics | grep -q http_request_duration_seconds
        '''
      }
    }
  }

  post {
    always {
      echo "Pipeline finished for ${env.SHORT_COMMIT}"
    }
  }
}