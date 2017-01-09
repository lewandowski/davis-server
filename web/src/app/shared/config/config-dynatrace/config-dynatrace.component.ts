import { Component, OnInit } from '@angular/core';

// Services
import { ConfigService } from '../config.service';
import { DavisService } from '../../davis.service';
import * as _ from "lodash";

@Component({
  selector: 'config-dynatrace',
  templateUrl: './config-dynatrace.component.html',
})
export class ConfigDynatraceComponent implements OnInit {

  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  isTokenMasked: boolean = true;
  isDirty: boolean = false;

  constructor(
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  doSubmit() {
    this.submitted = true;
    this.submitButton = 'Saving...';
    if (this.iConfig.values.dynatrace.url.slice(-1) === '/') {
      this.iConfig.values.dynatrace.url = this.iConfig.values.dynatrace.url.substring(0, this.iConfig.values.dynatrace.url.length - 1);
    }
    this.iConfig.connectDynatrace()
      .then(response => {
        if (!response.success) { 
          this.resetSubmitButton(); 
          throw new Error(response.message); 
        }
        return this.iConfig.validateDynatrace();
      })
      .then(response => {
        if (!response.success) { 
          this.resetSubmitButton(); 
          throw new Error(response.message); 
        }
        
        this.iConfig.status['dynatrace'].success = true;
        if (this.iConfig.isWizard) {
          this.iConfig.selectView('user');
        } else {
          this.resetSubmitButton();
        }
      })
      .catch(err => {
        this.iConfig.displayError(err, 'dynatrace');
      });
  }

  validate() {
    this.isDirty = !_.isEqual(this.iConfig.values.dynatrace, this.iConfig.values.original.dynatrace);
  }

  resetSubmitButton() {
    this.submitButton = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  }

  ngOnInit() {
    document.getElementsByName('url')[0].focus();
    if (window.location.protocol === 'http') {
      this.iConfig.status['dynatrace'].error = 'Warning, please note that "https://" is required for Davis to interact with Alexa, Slack, and Watson APIs!';
      this.iConfig.status['dynatrace'].success = false;
    }
    this.validate();
  }
}
