import { Component, OnInit } from '@angular/core';

// Services
import { ConfigService } from '../config.service';
import { DavisService }  from '../../davis.service';
import * as _ from "lodash";

@Component({
  selector: 'config-alexa',
  templateUrl: './config-alexa.component.html',
})
export class ConfigAlexaComponent implements OnInit {
  submitted: boolean = false;
  submitButton: string = (this.iConfig.isWizard) ? 'Skip' : 'Save';
  isDirty: boolean = false;

  constructor(
    public iDavis: DavisService,
    public iConfig: ConfigService) { }

  doSubmit() {
    this.submitted = true;
    if (this.iDavis.values.user.alexa_ids) {
      this.submitButton = 'Saving...';
      this.iConfig.connectAlexa()
        .then(response => {
          if (!response.success) { 
            this.resetSubmitButton(); 
            throw new Error(response.message); 
          }
          this.iConfig.status['alexa'].success = true;
          this.iConfig.selectView('slack');
        })
        .catch(err => {
          this.iConfig.displayError(err, 'alexa');
        });
    } else {
      this.iConfig.selectView('slack');
    }
  }

  validate() {
    if (this.iDavis.values.user.alexa_ids) {
      this.submitButton = 'Continue';
    } else {
      this.submitButton = 'Skip';
    }
    this.isDirty = !_.isEqual(this.iDavis.values.user, this.iConfig.values.original.user);
  }

  resetSubmitButton() {
    this.submitButton = (this.iConfig.isWizard) ? 'Continue' : 'Save';
  }

  ngOnInit() {
    document.getElementsByName('alexa')[0].focus();
  }
}
