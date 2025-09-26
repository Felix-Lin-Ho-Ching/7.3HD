
pipeline {
  agent any

  environment {
    REGISTRY = credentials('REGISTRY_URL') 
    DOCKERHUB_USER = credentials('DOCKERHUB_USER')
    DOCKERHUB_PASS = credentials('DOCKERHUB_PASS')
    SONAR_HOST_URL = credentials('SONAR_HOST_URL')
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SNYK_TOKEN = credentials('SNYK_TOKEN') 
    APP = 'sit753-7-3hd-pipeline'
  }

  options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
    }
  }
}

  stage('Build') {
    steps {
      withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_PASS')]) {
        sh '''
          echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin
          IMAGE_REPO="${DOCKERHUB_USER}/sit753-7-3hd-pipeline"
          docker build -t "${IMAGE_REPO}:${GIT_SHA}" -t "${IMAGE_REPO}:latest" .
          docker push "${IMAGE_REPO}:${GIT_SHA}"
          docker push "${IMAGE_REPO}:latest"
        '''
      }
    }
  } 

  stage('Test') {
    steps {
      withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_PASS')]) {
        sh '''
          IMAGE_REPO="${DOCKERHUB_USER}/sit753-7-3hd-pipeline"
          rm -rf reports && mkdir -p reports

          # Run tests INSIDE the app image.
          # NPM_CONFIG_PRODUCTION=false ensures devDependencies (jest) are installed for testing.
          docker run --rm \
          -e NODE_ENV=development \
          -e NPM_CONFIG_PRODUCTION=false \
          -v "$PWD/reports:/app/reports" \
          "${IMAGE_REPO}:${GIT_SHA}" \
          sh -lc "npm ci && npx jest --runInBand --ci --reporters=default --reporters=jest-junit"
        '''
      }
    }
    post {
      always {
        junit 'reports/junit.xml'
    }
  }
} 

    stage('Code Quality') {
      steps {
        sh '''#!/bin/sh
          docker run --rm -e SONAR_HOST_URL=${SONAR_HOST_URL} -e SONAR_LOGIN=${SONAR_TOKEN} \
            -v $(pwd):/usr/src sonarsource/sonar-scanner-cli:latest
        '''
      }
    }

    stage('Security') {
      steps {
        sh '''#!/bin/sh
          # Snyk dependency test (optional)
          if [ -n "${SNYK_TOKEN}" ]; then
            docker run --rm -e SNYK_TOKEN=${SNYK_TOKEN} -v /var/run/docker.sock:/var/run/docker.sock \
              -v $(pwd):/project snyk/snyk:docker test ${IMAGE} || true
          fi

          # Trivy image scan: fail on CRITICAL vulns
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --severity CRITICAL --exit-code 1 ${IMAGE}
        '''
      }
    }

    stage('Deploy: Staging') {
      steps {
        sh '''#!/bin/sh
          TAG=${GIT_SHA} REGISTRY=${REGISTRY} docker compose -f docker-compose.staging.yml up -d --pull=always --build
          # Smoke health check
          sleep 2
          curl -fsS http://host.docker.internal:3000/healthz
          curl -fsS http://host.docker.internal:3000/api/version
        '''
      }
    }

    stage('Release: Production') {
      when {
        branch 'main'
      }
      steps {
        input message: "Promote ${GIT_SHA} to PRODUCTION?", ok: "Release"
        sh '''#!/bin/sh
          TAG=${GIT_SHA} REGISTRY=${REGISTRY} docker compose -f docker-compose.prod.yml up -d
        '''
      }
    }

    stage('Monitoring Check') {
      steps {
        sh '''#!/bin/sh
          # Verify metrics endpoint is live
          curl -fsS http://host.docker.internal:3000/metrics | head -n 5
        '''
      }
    }
  }

  post {
    success {
      echo "Pipeline completed successfully for ${GIT_SHA}"
    }
    failure {
      echo "Pipeline failed for ${GIT_SHA}"
    }
  }
}
