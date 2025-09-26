
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
          sh 'git rev-parse --short HEAD > .git-sha'
          env.GIT_SHA = readFile('.git-sha').trim()
          env.IMAGE = "${REGISTRY}/${APP}:${GIT_SHA}"
        }
      }
    }

    stage('Build') {
      steps {
        sh '''#!/bin/sh
          docker login -u ${DOCKERHUB_USER} -p ${DOCKERHUB_PASS}
          docker build -t ${IMAGE} -t ${REGISTRY}/${APP}:latest .
          docker push ${IMAGE}
          docker push ${REGISTRY}/${APP}:latest
        '''
      }
    }

    stage('Test') {
      steps {
        sh '''
        # clean + a place for the report in the workspace
        rm -rf reports && mkdir -p reports

        # run tests **inside the built image**, making sure dev deps are installed
        docker run --rm \
        -e NODE_ENV=development \
        -e NPM_CONFIG_PRODUCTION=false \
        -v "$PWD/reports:/app/reports" \
        ${REGISTRY}/${DOCKERHUB_USER}/sit753-7-3hd-pipeline:${GIT_SHA} \
        sh -lc "npm ci && npx jest --runInBand --ci --reporters=default --reporters=jest-junit"
    '''
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
